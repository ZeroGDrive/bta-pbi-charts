const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const args = process.argv.slice(2);

/**
 * Find the real npm binary on PATH, excluding this shim directory to avoid recursion.
 */
function findRealNpm() {
  const shimDir = __dirname;
  const pathEnv = process.env.PATH || "";
  const parts = pathEnv.split(path.delimiter).filter(Boolean);

  const candidates = [];
  for (const dir of parts) {
    if (path.resolve(dir) === path.resolve(shimDir)) continue;
    candidates.push(dir);
  }

  const binName = process.platform === "win32" ? "npm.cmd" : "npm";
  for (const dir of candidates) {
    const full = path.join(dir, binName);
    try {
      if (fs.existsSync(full)) {
        return { npmPath: full, cleanPath: candidates.join(path.delimiter) };
      }
    } catch {
      // ignore
    }
  }

  return { npmPath: null, cleanPath: candidates.join(path.delimiter) };
}

// `powerbi-visuals-tools` runs: `npm list powerbi-visuals-api version`
// Under Bun-installed node_modules, `npm list` can report an empty tree.
// This shim returns an output format that `powerbi-visuals-tools` can parse.
if (args[0] === "list" && args.includes("powerbi-visuals-api") && args.includes("version")) {
  const pkgPath = path.join(process.cwd(), "node_modules", "powerbi-visuals-api", "package.json");
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const version = String(pkg.version || "0.0.0");
    process.stdout.write(`powerbi-visuals-api@${version}\n`);
    process.exit(0);
  } catch {
    process.stdout.write("powerbi-visuals-api@0.0.0\n");
    process.exit(0);
  }
}

// For everything else, delegate to the real npm (GitHub Actions has it, and locally Node provides it).
const { npmPath, cleanPath } = findRealNpm();
if (!npmPath) {
  process.stderr.write("npm shim error: unable to locate the real npm binary on PATH.\n");
  process.exit(1);
}

const res = spawnSync(npmPath, args, {
  stdio: "inherit",
  env: { ...process.env, PATH: cleanPath },
});

process.exit(typeof res.status === "number" ? res.status : 1);
