import { spawn } from "node:child_process";
import path from "node:path";

const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const env = {
  ...process.env,
  LANG: process.env.LANG || "C.UTF-8",
  LC_ALL: process.env.LC_ALL || "C.UTF-8",
  PYTHONIOENCODING: "utf-8",
};

function exitWithChildCode(code, signal) {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
}

if (process.platform === "win32") {
  const command = [
    "$utf8 = [System.Text.UTF8Encoding]::new($false)",
    "[Console]::InputEncoding = $utf8",
    "[Console]::OutputEncoding = $utf8",
    "$OutputEncoding = $utf8",
    "chcp 65001 > $null",
    `node "${nextBin}" build`,
  ].join("; ");

  const child = spawn(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
    { stdio: "inherit", env },
  );

  child.on("exit", exitWithChildCode);
} else {
  const child = spawn(process.execPath, [nextBin, "build"], {
    stdio: "inherit",
    env,
  });

  child.on("exit", exitWithChildCode);
}
