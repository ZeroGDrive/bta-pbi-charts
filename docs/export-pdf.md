# PDF export (official Power BI flow)

## Scope

This repository relies on the official Power BI report export path for PDF output.

- Full-page/report export is handled by Power BI host functionality.
- Custom visuals in this repo do **not** provide in-visual custom file download buttons.

## Recommended production path

1. Publish the report to Power BI Service.
2. Use native report export:
   - `File -> Export -> PDF`
3. For API automation, use Power BI Export To File API at report/page level.

## Certification note

For custom visuals, report export fidelity in official Power BI export flows depends on Microsoft certification and distribution requirements.

If a visual is not eligible in a given environment, exported reports may show placeholders instead of visual output.

## What was removed

- In-visual custom PDF download controls.
- `ExportContent` privilege declarations used for custom file download.
- Shared custom SVG->PDF export pipeline.

## Validation checklist

1. `bun run build:shared`
2. `bun run build:all`
3. Open report in Power BI Service/Desktop and test native report export.
4. Confirm exported PDF includes expected visuals according to tenant/certification status.
