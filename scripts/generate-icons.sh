#!/usr/bin/env bash
set -euo pipefail

# Regenerates each visual's `assets/icon.png` from `assets/icon.svg`.
# Uses `@resvg/resvg-js` (runs via Node) to preserve transparency and colors.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

node scripts/generate-icons.mjs
