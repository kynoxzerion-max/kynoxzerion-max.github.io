import { spawn } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, request as httpRequest } from "node:http";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocket, WebSocketServer } from "ws";
import { getIceServers } from "./ice-servers.mjs";

const rootDirectory = resolve(fileURLToPath(new URL("..", import.meta.url)));
const buildDirectory = resolve(rootDirectory, "dist");
const host = process.env.HOST ?? "0.0.0.0";

function readPort(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${name} must be a valid TCP port.`);
  }
  return value;
}

const port = readPort("PORT", 3000);
const leaguePort = readPort("LEAGUE_PORT", 8788);
const callsPort = readPort("CALLS_PORT", 8787);

if (new Set([port, leaguePort, callsPort]).size !== 3) {
  throw new Error("PORT, LEAGUE_PORT, and CALLS_PORT must be different.");
}
if (!existsSync(resolve(buildDirectory, "index.html"))) {
  throw new Error("Production build not found. Run `npm run build` before `npm start`.");
}

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(JSON.stringify(payload));
}

function proxyLeagueRequest(request, response) {
  const headers = { ...request.headers };
  delete headers.connection;
  delete headers["keep-alive"];
  delete headers["proxy-connection"];
  delete headers.te;
  delete headers.trailer;
  delete headers["transfer-encoding"];
  delete headers.upgrade;
  const forwardedFor = process.env.TRUST_PROXY === "true" && typeof request.headers["x-forwarded-for"] === "string"
    ? request.headers["x-forwarded-for"].trim()
    : "";
  headers["x-forwarded-for"] = [forwardedFor, request.socket.remoteAddress ?? ""].filter(Boolean).join(", ");
  headers["x-forwarded-proto"] = request.headers["x-forwarded-proto"]
    ?? (request.socket.encrypted ? "https" : "http");

  const upstream = httpRequest({
    hostname: "127.0.0.1",
    port: leaguePort,
    method: request.method,
    path: request.url,
    headers,
  }, (upstreamResponse) => {
    response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
    upstreamResponse.pipe(response);
  });

  upstream.on("error", (error) => {
    console.error("Creator League API proxy error:", error.message);
    if (!response.headersSent) sendJson(response, 502, { error: "Creator League -palvelu ei ole käytettävissä." });
    else response.destroy(error);
  });
  request.on("aborted", () => upstream.destroy());
  response.on("close", () => {
    if (!response.writableEnded) upstream.destroy();
  });
  request.pipe(upstream);
}

async function serveFile(request, response, pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    sendJson(response, 400, { error: "Virheellinen polku." });
    return;
  }

  const requestedPath = resolve(buildDirectory, `.${decodedPath}`);
  const relativePath = relative(buildDirectory, requestedPath);
  if (relativePath === ".." || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    sendJson(response, 403, { error: "Pääsy estetty." });
    return;
  }

  let filePath = requestedPath;
  let fileInfo;
  try {
    fileInfo = await stat(filePath);
    if (fileInfo.isDirectory()) {
      filePath = resolve(filePath, "index.html");
      fileInfo = await stat(filePath);
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code !== "ENOENT" && error.code !== "ENOTDIR") {
      console.error("Could not read frontend file:", error);
      sendJson(response, 500, { error: "Sivua ei voitu ladata." });
      return;
    }
    if (extname(decodedPath)) {
      sendJson(response, 404, { error: "Tiedostoa ei löytynyt." });
      return;
    }
    filePath = resolve(buildDirectory, "index.html");
    fileInfo = await stat(filePath);
  }

  if (!fileInfo.isFile()) {
    sendJson(response, 404, { error: "Tiedostoa ei löytynyt." });
    return;
  }

  const headers = {
    "content-length": fileInfo.size,
    "content-type": mimeTypes[extname(filePath).toLowerCase()] ?? "application/octet-stream",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "cache-control": pathname.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
  };
  response.writeHead(200, headers);
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  createReadStream(filePath)
    .on("error", (error) => {
      console.error("Could not stream frontend file:", error);
      response.destroy(error);
    })
    .pipe(response);
}

const server = createServer((request, response) => {
  let pathname;
  try {
    pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  } catch {
    sendJson(response, 400, { error: "Virheellinen pyyntö." });
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD" && !pathname.startsWith("/api/creator-league")) {
    response.writeHead(405, { allow: "GET, HEAD", "content-length": "0" });
    response.end();
    return;
  }
  if (pathname === "/health") {
    sendJson(response, 200, { status: "ok" });
    return;
  }
  if (request.method === "GET" && pathname === "/api/calls/ice-servers") {
    try {
      sendJson(response, 200, { iceServers: getIceServers() });
    } catch (error) {
      console.error("Could not configure call ICE servers:", error);
      sendJson(response, 503, { error: "Puhelupalvelimen ICE-asetukset eivät ole kelvolliset." });
    }
    return;
  }
  if (pathname === "/api/creator-league" || pathname.startsWith("/api/creator-league/")) {
    proxyLeagueRequest(request, response);
    return;
  }
  if (pathname.startsWith("/api/")) {
    sendJson(response, 404, { error: "Reittiä ei löytynyt." });
    return;
  }
  void serveFile(request, response, pathname).catch((error) => {
    console.error("Frontend request failed:", error);
    if (!response.headersSent) sendJson(response, 500, { error: "Sivua ei voitu ladata." });
    else response.destroy(error);
  });
});

const callWebSockets = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });
server.on("upgrade", (request, socket, head) => {
  let pathname;
  try {
    pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  } catch {
    socket.destroy();
    return;
  }
  if (pathname !== "/calls") {
    socket.destroy();
    return;
  }

  callWebSockets.handleUpgrade(request, socket, head, (client) => {
    const upstream = new WebSocket(`ws://127.0.0.1:${callsPort}/calls`);
    const pending = [];

    client.on("message", (data, isBinary) => {
      if (upstream.readyState === WebSocket.OPEN) upstream.send(data, { binary: isBinary });
      else if (upstream.readyState === WebSocket.CONNECTING) pending.push([data, isBinary]);
    });
    upstream.on("open", () => {
      for (const [data, isBinary] of pending) upstream.send(data, { binary: isBinary });
      pending.length = 0;
    });
    upstream.on("message", (data, isBinary) => {
      if (client.readyState === WebSocket.OPEN) client.send(data, { binary: isBinary });
    });
    client.on("close", () => {
      if (upstream.readyState === WebSocket.CONNECTING) upstream.terminate();
      else if (upstream.readyState === WebSocket.OPEN) upstream.close();
    });
    upstream.on("close", () => {
      if (client.readyState === WebSocket.OPEN) client.close();
    });
    upstream.on("error", (error) => {
      console.error("Call signaling proxy error:", error.message);
      if (client.readyState === WebSocket.OPEN) client.close(1011, "Call service unavailable");
    });
  });
});

const childEnvironment = {
  ...process.env,
  NODE_ENV: "production",
};
const children = [
  spawn(process.execPath, ["server/calls.mjs"], {
    cwd: rootDirectory,
    stdio: "inherit",
    env: { ...childEnvironment, CALLS_HOST: "127.0.0.1", CALLS_PORT: String(callsPort) },
    windowsHide: true,
  }),
  spawn(process.execPath, ["server/creator-league.mjs"], {
    cwd: rootDirectory,
    stdio: "inherit",
    env: { ...childEnvironment, LEAGUE_HOST: "127.0.0.1", LEAGUE_PORT: String(leaguePort) },
    windowsHide: true,
  }),
];

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  process.exitCode = code;
  for (const client of callWebSockets.clients) client.close(1001, "Server shutting down");
  if (server.listening) server.close();
  for (const child of children) {
    if (child.exitCode === null) child.kill();
  }
}

for (const child of children) {
  child.on("error", (error) => {
    console.error("Could not start a production service:", error);
    shutdown(1);
  });
  child.on("exit", (code) => {
    if (!shuttingDown) {
      console.error(`A production service exited unexpectedly with code ${code ?? "unknown"}.`);
      shutdown(code ?? 1);
    }
  });
}

async function waitForHealth(portToCheck) {
  const healthUrl = `http://127.0.0.1:${portToCheck}/health`;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (shuttingDown) throw new Error("A production service failed to start.");
    try {
      const response = await fetch(healthUrl, { signal: AbortSignal.timeout(500) });
      if (response.ok) return;
    } catch {
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
    }
  }
  throw new Error(`Production service health check failed at ${healthUrl}.`);
}

try {
  await Promise.all([waitForHealth(callsPort), waitForHealth(leaguePort)]);
  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(port, host, resolveListen);
  });
  console.log(`NEXUS production server listening on http://${host}:${port}`);
} catch (error) {
  console.error(error);
  shutdown(1);
}

process.on("SIGINT", () => shutdown());
process.on("SIGTERM", () => shutdown());
