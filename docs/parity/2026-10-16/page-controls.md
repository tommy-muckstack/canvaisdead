# Page actions beneath the formatting toolbar

## Observed difference

The completed native run on #44, [38898663642](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38898663642), confirms the formatting toolbar intercepts ordinary clicks on Add page and Done selecting at 390px. Retained desktop and mobile screenshots show that separate toolbar covering the page-action row. Page-editing cases cannot complete. This is an interaction defect, not a visual-match claim against the reference.

## Change

Measure the formatting toolbar and page-action row, reserving separate vertical space for both. The action row starts 12px below the formatting bar, and the fitted canvas/grid starts below the actions. ResizeObserver follows wrapped controls and workspace resizing. The action row stays below the formatting bar during vertical workspace scrolling. Existing page actions, text blur commits, history, saved designs and local-only persistence are unchanged.

The React review keeps transient measurements in CSS custom properties instead of application state and disconnects observers/listeners on cleanup. There is no dependency, service, credential, billing, auth or analytics change.

## Verification

- Retain the original page-editing regression: type directly in text, click Add page or Duplicate page without explicitly blurring, verify preserved text, reorder/delete/undo, reload, grid keyboard navigation and current-page SVG contents.
- Add native cases for hit-testing every enabled page action, separated control/canvas bounds, text and multi-selection toolbars, normal Done selecting/More/Edit page clicks, grid clearance, viewport reflow, zoom/workspace scrolling, Add page and undo.
- Run the complete existing browser inventory too; do not treat the focused cases as proof of unrelated workflows.
- Capture the actual parent Editor/CSS for before images and the changed editor for after images at 1440px and 390px. Only synthetic demo data enters the free CI logs; no artifacts/cache storage or production credentials are used.

Local lint, typecheck, all 388 unit tests in 37 files and the production build pass with the documented dependency overlay. Playwright discovers 174 tests in 29 files, including four new page-control instances. Native results, retained screenshots and measured styles are pending. Original/clone paired visual verification and broader parity remain incomplete; this row stays `differs`.
