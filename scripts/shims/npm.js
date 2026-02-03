const fs = require("node:fs");
const path = require("node:path");

const args = process.argv.slice(2);

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

process.stderr.write("This repo uses Bun. The bundled npm shim only supports: npm list powerbi-visuals-api version\n");
process.exit(1);

