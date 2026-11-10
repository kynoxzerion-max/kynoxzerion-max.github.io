import { createHmac, randomBytes } from "node:crypto";

export function getIceServers() {
  const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
  const turnUrls = (process.env.TURN_URL ?? "").split(",").map((url) => url.trim()).filter(Boolean);
  if (!turnUrls.length) return iceServers;

  const sharedSecret = process.env.TURN_SHARED_SECRET;
  if (!sharedSecret) throw new Error("TURN_SHARED_SECRET is required when TURN_URL is configured.");
  if (turnUrls.some((url) => !/^turns?:/i.test(url))) {
    throw new Error("TURN_URL must contain one or more turn: or turns: URLs.");
  }
  const ttl = Number(process.env.TURN_TTL_SECONDS ?? 600);
  if (!Number.isInteger(ttl) || ttl < 60 || ttl > 3600) {
    throw new Error("TURN_TTL_SECONDS must be between 60 and 3600.");
  }

  const username = `${Math.floor(Date.now() / 1000) + ttl}:${randomBytes(8).toString("hex")}`;
  const credential = createHmac("sha1", sharedSecret).update(username).digest("base64");
  iceServers.push({ urls: turnUrls, username, credential });
  return iceServers;
}
