import { writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";

const cwd = "C:\\Users\\crcrc\\Documents\\Codex\\2026-05-27\\new-chat-2\\central-europe-political-atlas";
const nodePath = "C:\\Users\\crcrc\\scoop\\apps\\nodejs-lts\\current\\node.exe";
const nextPath = join(cwd, "node_modules", "next", "dist", "bin", "next");
const logPath = join(cwd, "dev-server.log");
const errPath = join(cwd, "dev-server.err.log");
writeFileSync(logPath, `[${new Date().toISOString()}] Launching Next dev server\n`);
writeFileSync(errPath, "");

const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toLowerCase() !== "path"));
const pathValue = process.env.Path ?? process.env.PATH ?? "";
const pathPrefix = [
  "C:\\Users\\crcrc\\scoop\\apps\\nodejs-lts\\current\\bin",
  "C:\\Users\\crcrc\\scoop\\apps\\nodejs-lts\\current",
  "C:\\Users\\crcrc\\scoop\\persist\\nodejs-lts\\bin",
].join(";");

const child = spawn(nodePath, [nextPath, "dev", "--webpack", "-p", "3000"], {
  cwd,
  detached: true,
  env: {
    ...cleanEnv,
    PATH: `${pathPrefix};${pathValue}`,
  },
  stdio: "ignore",
  windowsHide: true,
});

child.unref();
console.log(child.pid);
