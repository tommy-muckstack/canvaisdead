# Native multiline text interaction audit

The #45 browser run still times out in end-anchored text editing and spacing-preview dragging at both widths. The existing locators click the center of the complete SVG text element, which can be unpainted space between lines. A locator requiring the SVG text node itself to receive that event may wait even when the canvas can handle the same user click. This is a hypothesis to verify with native hit-testing, not a confirmed application defect.

Keep the editor implementation unchanged while measuring each target with `elementFromPoint`. Click the canvas at the same measured text coordinates using normal Playwright pointer actions, and assert that the point belongs to the canvas rather than an overlay. Verify double-click editing both between lines and on a painted line, focus and preserved content, anchored growth, spacing preview/commit/drag/undo, lock protection and actual SVG output. Existing assertions are retained; no forced clicks or larger timeouts are introduced.

The four text-spacing scenarios run together at 1440px and 390px in the selection/download CI job. The complementary jobs retain the rest of the 174-case inventory. Synthetic native captures will show the spacing controls and edited text states; they are not original/clone comparisons or a changed product layout. No app code, styles, saved data, dependency, service, auth, billing or analytics behavior changes in this investigation.

Local lint, typecheck, all 388 unit tests in 37 files and the production build pass with the documented dependency overlay. Native target evidence and captures are pending. Full parity remains unverified. If native events expose an editor defect, fix it and rerun these unchanged behavioral requirements before closing this audit.
