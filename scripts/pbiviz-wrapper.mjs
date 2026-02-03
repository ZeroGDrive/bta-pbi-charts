import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import fs from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const shimDir = path.join(repoRoot, "scripts", "shims");
const localBin = path.join(process.cwd(), "node_modules", ".bin");
const rootBin = path.join(repoRoot, "node_modules", ".bin");

const existingPath = process.env.PATH ?? "";
process.env.PATH = [shimDir, localBin, rootBin, existingPath].filter(Boolean).join(path.delimiter);

// `powerbi-visuals-tools` expects `node_modules/powerbi-visuals-api` to exist in the visual's folder
// (it checks via `process.cwd()`), but Bun's hoisted install on CI may only create it at the repo root.
// Create a lightweight workspace link so `pbiviz package/start` doesn't try to `npm install` the API.
try {
  const localApi = path.join(process.cwd(), "node_modules", "powerbi-visuals-api");
  if (!fs.existsSync(localApi)) {
    const rootApi = path.join(repoRoot, "node_modules", "powerbi-visuals-api");
    if (fs.existsSync(rootApi)) {
      fs.mkdirSync(path.dirname(localApi), { recursive: true });
      fs.symlinkSync(rootApi, localApi, process.platform === "win32" ? "junction" : "dir");
    }
  }
} catch {
  // Best-effort; if it fails, pbiviz will fall back to its own install logic.
}

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
