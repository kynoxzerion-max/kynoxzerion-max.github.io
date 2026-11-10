import { spawn } from "node:child_process";

const children = [
  spawn(process.execPath, ["node_modules/vite/bin/vite.js"], {
    stdio: "inherit",
    env: {
      ...process.env,
      VITE_CREATOR_LEAGUE_PORT: process.env.LEAGUE_PORT ?? "8788",
    },
  }),
  spawn(process.execPath, ["server/calls.mjs"], { stdio: "inherit" }),
  spawn(process.execPath, ["server/creator-league.mjs"], { stdio: "inherit" }),
];
let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  process.exitCode = code;
  for (const child of children) {
    if (child.exitCode === null) child.kill();
  }
}

for (const child of children) {
  child.on("error", (error) => {
    console.error("Could not start a development service:", error);
    shutdown(1);
  });
  child.on("exit", (code) => {
    if (!shuttingDown) shutdown(code ?? 1);
  });
}

process.on("SIGINT", () => shutdown());
process.on("SIGTERM", () => shutdown());
