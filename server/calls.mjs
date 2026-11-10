import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { getIceServers } from "./ice-servers.mjs";

const port = Number(process.env.CALLS_PORT ?? 8787);
const host = process.env.CALLS_HOST ?? "0.0.0.0";
const rooms = new Map();
const server = createServer((request, response) => {
  if (request.method === "GET" && request.url === "/api/calls/ice-servers") {
    try {
      response.writeHead(200, {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      });
      response.end(JSON.stringify({ iceServers: getIceServers() }));
    } catch (error) {
      console.error("Could not configure call ICE servers:", error);
      response.writeHead(503, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      response.end(JSON.stringify({ error: "Puhelupalvelimen ICE-asetukset eivät ole kelvolliset." }));
    }
    return;
  }
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "ok", rooms: rooms.size }));
    return;
  }
  response.writeHead(404);
  response.end("Not found");
});

const sockets = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });

server.on("upgrade", (request, socket, head) => {
  if (request.url !== "/calls") {
    socket.destroy();
    return;
  }
  sockets.handleUpgrade(request, socket, head, (webSocket) => {
    sockets.emit("connection", webSocket);
  });
});

function send(socket, message) {
  if (socket.readyState === 1) socket.send(JSON.stringify(message));
}

function leave(socket) {
  const room = socket.room;
  if (!room) return;
  socket.room = undefined;
  room.peers.delete(socket);
  for (const peer of room.peers) send(peer, { type: "peer-left" });
  if (room.peers.size === 0) rooms.delete(room.id);
}

sockets.on("connection", (socket) => {
  socket.on("message", (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      send(socket, { type: "error", message: "Signalointipalvelin vastaanotti virheellisen viestin." });
      return;
    }

    if (message.type === "join") {
      const roomId = typeof message.room === "string" ? message.room : "";
      const mode = message.mode;
      if (!/^[AV]-[A-Z0-9]{8}$/.test(roomId) || (mode !== "audio" && mode !== "video")) {
        send(socket, { type: "error", message: "Kutsukoodi ei ole kelvollinen." });
        return;
      }
      if (socket.room) {
        send(socket, { type: "error", message: "Olet jo liittynyt puheluun." });
        return;
      }
      const roomMode = roomId.startsWith("V-") ? "video" : "audio";
      if (mode !== roomMode) {
        send(socket, { type: "error", message: "Kutsukoodin puhelutyyppi ei täsmää." });
        return;
      }
      let room = rooms.get(roomId);
      if (room && room.peers.size >= 2) {
        send(socket, { type: "error", message: "Puhelu on täynnä." });
        return;
      }
      if (!room) {
        room = { id: roomId, mode, peers: new Set() };
        rooms.set(roomId, room);
      }
      socket.room = room;
      room.peers.add(socket);
      if (room.peers.size === 1) {
        room.expiryTimer = setTimeout(() => {
          for (const peer of room.peers) {
            send(peer, { type: "error", message: "Puhelukutsu vanheni. Aloita uusi puhelu." });
            peer.close(1000, "Invite expired");
          }
        }, 10 * 60 * 1000);
        room.expiryTimer.unref();
        send(socket, { type: "waiting" });
      } else {
        clearTimeout(room.expiryTimer);
        room.expiryTimer = undefined;
        for (const peer of room.peers) {
          send(peer, { type: "peer-joined", initiator: peer === socket });
        }
      }
      return;
    }

    if (message.type === "leave") {
      leave(socket);
      return;
    }
    if (message.type === "signal" && socket.room && message.signal && typeof message.signal === "object") {
      for (const peer of socket.room.peers) {
        if (peer !== socket) send(peer, { type: "signal", signal: message.signal });
      }
      return;
    }
    send(socket, { type: "error", message: "Puhelupalvelin ei tue tätä viestiä." });
  });

  socket.on("close", () => leave(socket));
  socket.on("error", (error) => console.error("Call signaling socket error:", error.message));
});

server.listen(port, host, () => {
  console.log(`NEXUS call signaling server listening on ${host}:${port}`);
});
