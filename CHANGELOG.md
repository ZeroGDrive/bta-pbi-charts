# Changelog

## v1.0.9 - 2026-02-04

### Added
- Canvas tooltip support for touch and pointer events (Power BI Mobile compatible).

### Changed
- Tooltip ownership moved to the visual lifecycle (renderer no longer recreates/destroys tooltip DOM every render).
- Bubble simulation ticks now stop on alpha convergence (less wasted work on small datasets, more stable on large ones).

### Fixed
- Robust `getContrastColor()` handling for CSS colors beyond 6-digit hex (3-digit hex, rgb/rgba, named colors).
- Calendar heatmap canvas hit-testing optimized from O(n) scan to O(1) coordinate-to-cell mapping.
- Canvas drawing now restores context reliably even on exceptions (save/restore wrapped with try/finally).
- Text measurement cache bounded with LRU eviction and shared measurement canvas reuse.
- Canvas resize now clamps malformed negative viewports more safely.

## v1.0.8 - 2026-02-04

### Added
- Donut Chart visual (rainbow by default) with center total, hover highlight, small multiples, and custom tooltips.
- Heatmap true hierarchical axes using `matrix` data mapping (supports up to 5 levels for X and Y).

### Changed
- Heatmap X-axis ordering for date-like labels now prefers chronological sorting over alphabetical.
- Shared formatting model utilities extended for Donut settings + additional text size controls.

### Fixed
- Donut inside-label auto-fit now sizes based on slice geometry + label length, with safer overflow handling.
- Outside-label leader lines now anchor to the correct slice and use collision-avoiding placement.
