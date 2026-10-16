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

Local lint, typecheck, all 388 unit tests in 37 files and the production build pass with the documented dependency overlay. Playwright discovers 174 tests in 29 files, including four new page-control instances. Original/clone paired visual verification and broader parity remain incomplete; this row stays `differs`.

The first completed native run, [38901647327](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38901647327), reports 137 passed, 35 failed and 2 skipped. Both unchanged page-editing cases now pass; the general suite also gains passing mobile cut, bulk keyboard-selection and touch-selection cases. Its new desktop-to-mobile reflow case initially checked the workspace while the explicitly opened Text picker still overlaid it. The case now closes that picker with its normal visible toggle before asserting workspace reachability; all geometry and ordinary-click assertions remain. The two text-anchoring failures predate this change and still need a separate investigation. The final follow-up is recorded below.

## Native captures and focused results

[Follow-up run 38902654808](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38902654808), selection/download job 116978420080, reports **22 passed / 2 failed**. All four new page-control instances pass. Both original page-editing instances pass unchanged, including direct text blur into Add/Duplicate, undo/reorder/reload, grid keyboard navigation and actual current-page SVG content. The two failures are the pre-existing end-anchoring text-edit cases. Six separate baseline capture flows pass; they are not included in the 174 regressions. The storage job (116978419863) passes all 32 cases. The general editor/library job (116978419827) reports 84 passed, 32 failed and 2 skipped. Total: **138 passed / 34 failed / 2 skipped** across all 174 regressions. Clean install, lint, typecheck, 388 unit tests and production build pass. No previously passing case appears in this failure list; both page cases and the three mobile cut/selection cases pass again. The remaining failures include known test/fixture issues and interactions needing investigation; the stack is not green.

Tested commit: `f10d89d6b8b4af0ed4806e06c6271670ba1c02fc`, tree `f0e8983b513045b6a311925d866d671bdb888c84`. The before capture rebuilds the actual parent Editor/CSS at `9a7373ead25f1541dc8f18568dfb07b4dd7a2873`. Four unmodified native PNGs were retained and visually inspected; [measured bounds, hit targets and computed styles](page-controls.json) record their origin.

| Width | Before | After | Observed change |
| --- | --- | --- | --- |
| 1440px | [Before](page-controls-desktop-before.png) | [After](page-controls-desktop-after.png) | Actions move from y=60 to y=118, 12px below the 38px formatting bar. Title, Duplicate, Add and Select multiple change from blocked to reachable. Canvas dimensions stay 1000 × 562.5px; its top moves down 29px. |
| 390px | [Before](page-controls-mobile-before.png) | [After](page-controls-mobile-after.png) | Wrapped actions move from y=108 to y=212, 12px below the 96px formatting bar. All five enabled controls become reachable. Canvas dimensions stay 302 × 169.875px; its top moves down 82px. |

Row font, padding, gap, radius and wrapping styles are unchanged. Dynamic viewport resize, zoom and vertical workspace scroll pass the added cases; an explicitly open mobile picker still overlays the workspace until closed. Extreme viewport heights, horizontal panning and exact reference layout still need comparison. No full-parity or merge-readiness claim is made.
