# Floating toolbar placement

Date: 2026-10-16. Scope: element/group action placement and access to selected artwork. Stacked on #43; no merge or deployment.

## Evidence and change

Native [run 38894957721](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38894957721) reports `.cv-float` intercepting the double-click in the mobile text-layout regression. The toolbar uses a fixed 50px offset despite wrapping at narrow widths, and clamps its top to −22px relative to the page. This can place controls across selected text. It also ignores rotation and horizontal viewport edges.

Element and group action bars now measure their actual dimensions, anchor to rotated selection bounds and stay inside the visible workspace. They prefer the space above the selection, then below (leaving the rotate handle clear), then either side. Resize, zoom, scroll and visual viewport changes update placement. The available rectangle excludes top editor/page controls and bottom page/zoom/notes controls. The bar uses its content width and wraps only when the available width requires it.

When zoomed artwork fills the available viewport and leaves no outside slot, the actions stay reachable at the edge with least artwork overlap. This is a documented geometric limitation, not a claim of exact reference behavior. Icons, labels, actions and design data remain unchanged. Placement does not add a history step or save artwork.

## Verification

- Unit cases cover a wrapped bar over short text, top-edge fallback with rotate-handle clearance, tall artwork requiring side placement, and oversized/offscreen selections.
- Native regressions use ordinary double-click and keyboard controls, with no forced clicks. They check text editing/persistence, lock/unlock, More/Escape, rotated edge selection, zoom and grouping/ungrouping. Existing text-layout, spacing and page regressions remain intact.
- The same regression partition retains all existing 166 browser instances plus four new toolbar instances. A separate capture build uses the actual parent Editor and CSS to collect the before state; no regression assertions are changed for that build.
- Local lint, typecheck, **388 unit tests in 37 files** and production build pass. Playwright discovers 170 regression instances at the two widths, plus four separate capture-only flows.
- Completed [native run 38898663642](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38898663642) passes clean installation, lint, typecheck, **388 unit tests** and build. Selection/download job 116965213336: **16 passed / 4 failed**. All four new toolbar cases pass, and the previously failing mobile text-layout/edit/reload/SVG-export flow now passes. The four remaining failures are the existing page-editing and text-anchor flows at both widths, before Download opens. The mobile page case specifically reports the separate `.cv-ctx` formatting toolbar intercepting Add page; this is not the floating bar fixed here.
- Storage job 116965213705 passes **32/32**. Complementary editor/library job 116965213940 reports **81 passed / 35 failed / 2 skipped**. Overall: **129 passed / 39 failed / 2 skipped** out of 170. Three more previously failing mobile scenarios pass: locked-group protection, saved locks and read-only Position controls. No previously passing scenario appears in the new failure list. The remaining failures include both test/fixture problems and unresolved interactions; the stack remains unmerged.
- All four before-capture flows pass separately. Parent Editor/CSS are from `c9e40a99b4e71a328003c5ed4e6b771383d9b8aa`; tested new code is `73311d298883a97a67ec287477ff3db6c853241a`. The mobile bar changes from **151 × 62px** to **271 × 35px**. Before, hit-testing the text's center returns the floating toolbar; after, it returns the text tspan. The new bar ends approximately 14px above the selection outline. Desktop remains **291 × 35px**, moving down 1px to the same 14px gap. Padding (0px 6px), gap (2px), radius (9px), shadow and font remain unchanged.
- Inspected both screenshot pairs and retained [measured geometry/computed styles](toolbar-controls.json). Captures contain synthetic demo text and travel through free CI logs, with no artifact/cache upload. These are clone before/after captures; original/clone paired visual comparison remains outstanding, so full toolbar parity is not claimed.

| Viewport | Clone before | Clone after |
| --- | --- | --- |
| 1440 × 900 | [Before](toolbar-desktop-before.png) | [After](toolbar-desktop-after.png) |
| 390 × 844 | [Before](toolbar-mobile-before.png) | [After](toolbar-mobile-after.png) |

All artwork remains local. No new dependency, service, paid gate, auth/analytics change or secret. Exact reference behavior, dynamic scrolling/resizing beyond the exercised zoom changes, and extreme viewport constraints still require further browser comparison; these results do not establish full editor parity.
