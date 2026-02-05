# Native Power BI parity checklist

This repo targets a “native Power BI” feel: compact layouts, crisp rendering, and data-driven legends.

## Layout rules

- **No absolute-positioned legends**: always reserve plot space via `getLegendReservation()` and render via `renderLegend()`.
- **Axis padding**: ensure the last X-axis label does not overflow.
  - Prefer `text-anchor: end` for the last label and `start` for the first when not rotated.
  - Truncate labels with `formatLabel(...)` based on the effective per-label width.
- **Small multiples**: titles should not overlap content; use `smallMultiples.titleSpacing` and reserve legend space first.

## Legend behavior

- **Legend shows only when the Legend role is bound** (`hasLegendRoleData === true`).
- **Legend positions** should dock (top/bottom/left/right) and center correctly for “*Center*” options.
- **Smart layout**:
  - Top/bottom docks wrap into rows.
  - Left/right docks flow into columns.

## Text sizing

- **Formatting UX**: Text size controls must show the *effective starting size* (not `0`), even when stored overrides are `0` (= auto).
- **Rendering**: every visible text element must pull from the relevant setting:
  - `override > 0 ? override : baseSetting`
  - then clamp via `getEffectiveFontSize(...)`.
- Avoid CSS `font-size` rules on chart labels/ticks that would override SVG `font-size` attributes.

## Crispness

- Round pixel positions where possible (`Math.round(...)`) to avoid sub-pixel blur.
- Use `shape-rendering: crispEdges` for straight gridlines/rects, and `geometricPrecision` for curves.
- Avoid text shadows and heavy blur/drop-shadow filters.

## Known follow-ups

- Add optional **legend/axis transition** (e.g., 150–250ms) so repositioning feels native.
- Decide how to support Legend role in the **matrix-based heatmap** (role currently exists but isn’t mapped into the matrix shape).

## References (Microsoft Learn)

- https://learn.microsoft.com/en-us/power-bi/developer/visuals/
- https://learn.microsoft.com/en-us/power-bi/developer/visuals/formatting-model
- https://learn.microsoft.com/en-us/power-bi/developer/visuals/high-contrast-support
- https://learn.microsoft.com/en-us/power-bi/developer/visuals/tooltip-api
