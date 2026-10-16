# Verify reopening the visible crop frame

Date: 2026-10-16. Follow-up based on #57. Native geometry verification and parent/current captures are pending; no production change or original/clone parity match is claimed.

The desktop crop-reopen case completes crop, Undo/Redo and reload, then its image locator double-click is intercepted by the canvas background. The rendering source nests the original image inside a clipped SVG viewport. The image's own content quad can extend beyond that visible frame; the installed Playwright locator chooses a viewport-clamped quad centroid. This is a hypothesis until native measurements establish the actual target.

The corrected test records a bounded trial of the old locator, the native Chromium content quad, source/frame geometry, SVG transform, old centroid hit and visible-frame center hit. A normal canvas locator double-click targets the projected frame center, with no force option or synthetic DOM event; the observed double-click must be trusted and target the image. The original crop/source/Undo/Redo/reload/reset assertions remain. New checks cover the reopened zoom, uncommitted reset preview, original bytes and exact reset Undo/Redo/reload.

All eight crop instances move to the focused partition, with separate parent/current reopened/reset captures at 1440px and 390px. Before/after compares the same production implementation through a valid visible-frame action, not a claimed UI redesign. Local lint, typecheck and production build pass with the existing dependency overlay. Playwright discovers 188 cases: 90 focused, 32 storage and 66 general, with no overlap. Native outcomes and 28 expected baseline flows are pending. Physical touch, mobile nested-group editing and direct reference comparison remain unfinished.
