# bta-pbi-charts (AGENTS)

## What this repo is
Monorepo of Power BI custom visuals (pbiviz) plus a shared TypeScript package, managed with **Bun workspaces**.

## Tooling expectations
- Prefer **Bun** (lockfile is `bun.lock`).
- `pbiviz` comes from `powerbi-visuals-tools` (devDependency in each visual package) and is invoked via workspace scripts.

## Repo layout
- `packages/shared/`: shared TS utilities (`tsc` build output in `packages/shared/dist/`).
- `packages/<visual>/`: one Power BI visual per folder (heatmap, streamgraph, bump-chart, packed-bubble, calendar-heatmap).
  - entry: `src/visual.ts`
  - settings: `src/settings.ts`
  - manifest: `pbiviz.json`
  - capabilities: `capabilities.json`
  - build output: `dist/*.pbiviz`, transient build: `.tmp/`
- `dist/`: convenience folder containing packaged `.pbiviz` outputs.

## Common commands (run from repo root)
- Install dependencies: `bun install` (use `bun install --frozen-lockfile` in CI)
- Build shared package: `bun run build:shared`
- Package everything: `bun run build:all`
- Start a visual: `bun run start:heatmap` (or `start:streamgraph`, `start:bump-chart`, `start:calendar`, `start:bubble`)
- Package a visual: `bun run package:heatmap` (or `package:streamgraph`, `package:bump-chart`, `package:calendar`, `package:bubble`)
- Lint a visual package: `bun --filter @pbi-visuals/<package> lint` (currently fails due to ESLint v9 flat-config incompatibility with `eslint-plugin-powerbi-visuals`’ recommended config)

## Code conventions
- Keep data shaping in `*Transformer.ts` and DOM/SVG rendering in `*Renderer.ts`.
- Prefer shared helpers via `@pbi-visuals/shared` (`packages/shared/src/`).
- Don’t hand-edit generated artifacts: `dist/`, `.tmp/`, `webpack.statistics.*`.
- When changing `capabilities.json`, keep formatting/settings code in sync (`src/settings.ts`, `src/visual.ts`).

## Linting note
- If you need linting in CI/dev, either pin `eslint` to v8 or migrate the config using ESLint’s FlatCompat (`@eslint/eslintrc`).
