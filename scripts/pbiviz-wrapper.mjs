import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const shimDir = path.join(repoRoot, "scripts", "shims");
const localBin = path.join(process.cwd(), "node_modules", ".bin");

const existingPath = process.env.PATH ?? "";
process.env.PATH = [shimDir, localBin, existingPath].filter(Boolean).join(path.delimiter);

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: pbiviz-wrapper.mjs <pbiviz-args...>");
  process.exit(2);
}

const command = process.platform === "win32" ? "pbiviz.cmd" : "pbiviz";
const child = spawn(command, args, {
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code) => process.exit(code ?? 1));
