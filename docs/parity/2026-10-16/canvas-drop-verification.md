# Canvas drop placement and queued insertion

Date: 2026-10-16. Based on #52. Investigation in progress; no product geometry change or parity claim.

The completed #52 native run reports desktop thumbnail-drop Y=430.56 instead of the test's requested 432 design pixels, and mobile queued-drop X=381.45695 instead of 384. The latter stops before Undo/Redo. Desktop Elements dragging also fails a placement expectation. Those tests compare requested fractional coordinates with persisted artwork without observing the event delivered by Chromium.

This first diagnostic change retains the existing assertions and adds a capture listener before React handles each drop. It records actual client coordinates, the SVG bounds/viewBox/screen transform, data-transfer types and persisted artwork centers. It neither synthesizes replacement events nor changes production handlers. Native desktop mouse dragging and explicitly synthetic queued-drop tests remain distinct; physical touch dragging is unverified.

CI retains bounded JSON observations and viewport PNGs in its job log. No source-image bytes, credentials, external uploads or product storage changes are added. The next step is to inspect actual delivered coordinates, then verify placement and the previously unreached queued history assertions against that evidence. Local lint, typecheck and production build pass. Native execution is pending for this diagnostic commit.
