import { spawn } from "node:child_process";

const commands = [
  ["server", "npm", ["run", "dev:server"]],
  ["client", "npm", ["run", "dev:client"]]
];

const children = commands.map(([name, command, args]) => {
  const child = spawn(command, args, {
    env: process.env,
    shell: false,
    stdio: ["inherit", "pipe", "pipe"]
  });

  child.stdout.on("data", (chunk) => writePrefixed(name, chunk));
  child.stderr.on("data", (chunk) => writePrefixed(name, chunk));

  child.on("exit", (code, signal) => {
    if (isShuttingDown) return;

    console.error(`[${name}] exited with ${signal ?? code}`);
    shutdown(code === 0 || code === null ? 1 : code);
  });

  return child;
});

let isShuttingDown = false;

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

function writePrefixed(name, chunk) {
  for (const line of chunk.toString().split(/\r?\n/)) {
    if (line) process.stdout.write(`[${name}] ${line}\n`);
  }
}

function shutdown(exitCode) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }

  setTimeout(() => process.exit(exitCode), 250);
}
