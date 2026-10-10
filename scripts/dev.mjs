import { spawn } from "node:child_process";
import { resolve } from "node:path";
const children = [
  spawn(
    process.execPath,
    [
      "--env-file-if-exists=.env",
      "--experimental-strip-types",
      "apps/server/index.mjs",
    ],
    { stdio: "inherit" },
  ),
  spawn(
    process.execPath,
    [
      resolve("node_modules/vite/bin/vite.js"),
      "--host",
      "0.0.0.0",
      ...process.argv.slice(2),
    ],
    { cwd: "apps/web", stdio: "inherit" },
  ),
];
let closing = false;
function close(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of children) child.kill("SIGTERM");
  process.exitCode = code;
}
for (const child of children) {
  child.on("error", (error) => {
    console.error(error.message);
    close(1);
  });
  child.on("exit", (code) => close(code ?? 0));
}
process.on("SIGINT", () => close());
process.on("SIGTERM", () => close());
