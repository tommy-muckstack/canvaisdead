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
- Local lint, typecheck, **388 unit tests in 37 files** and production build pass. Playwright discovers 170 regression instances at the two widths, plus four separate capture-only flows. Native results/captures are pending. Original/clone paired visual comparison remains outstanding; this is a verified-failure follow-up, not full toolbar parity.

All artwork remains local. No new dependency, service, paid gate, auth/analytics change or secret.
