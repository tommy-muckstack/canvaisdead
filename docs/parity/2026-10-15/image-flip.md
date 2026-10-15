# Image flipping — 2026-10-15

## Comparison

The official [flip-and-rotate guide](https://www.canva.com/help/flip-and-rotate/) describes selecting an image, opening Flip on the editor toolbar and choosing horizontal or vertical reflection. It excludes text, native shapes and grouped elements. These are workflow requirements, not evidence of menu styling, computed styles, checked indicators or rotation/crop conventions. The clone previously had no Flip action or image reflection metadata.

## Implemented

- An unlocked individual image exposes Flip beside Crop. Horizontal and vertical actions toggle independently, indicate their state and each commit one undo step. Repeating a flip removes that flag. Whole groups and native text/shapes do not expose this control; selecting an individual image within a group preserves membership and other members.
- The shared menu supports arrow/Home/End navigation, Enter, Escape, Tab, outside dismissal, trigger toggling and focus return. It clamps to the viewport and renders in a body portal to avoid the desktop toolbar's transformed containing block. Icons are original SVG paths; no licensed artwork or new dependency is introduced.
- A local-axis reflection around the visible frame center precedes the existing outer rotation. Flipping keeps source bytes, crop coordinates, frame position/size, opacity and groups. This rotation convention is an engineering inference pending direct reference interaction checks.
- Crop pan deltas invert both rotation and reflection. Trim handles operate on the corresponding displayed edge, preserving source-pixel positions while the frame changes. The outside-source ghost and mask share the reflection, but handles and guides stay in frame axes. Ratio/zoom/reset/reopen preserve flags; reset restores the full source with the current orientation. A stale crop session cannot overwrite a newer flip.
- SVG and Canvas use the same reflection matrix. SVG applies rotation/opacity around the reflected crop viewport; Canvas reflects before clipping and painting, within its saved state. Thumbnails/presentations use SVG; PNG/JPG/PDF use the raster path. The source is not re-encoded. Unflipped SVG output remains unchanged.
- Local saves, undo/redo, grouped/page/library copies, clipboard and backups preserve both flags. Portable data validates booleans on images only. Backup version 6 and clipboard version 4 carry explicit flip metadata; previous versions remain supported without it. Older same-origin app versions can still ignore unknown fields in the unversioned local store—portable versioning does not fix that existing downgrade limitation.

## Verification

Lint, typecheck, all 278 unit tests across 23 files and production build pass using the documented dependency overlay. A clean dependency install remains unverified. Existing workspace-root, Next ESLint-plugin and Vitest configuration warnings remain.

Twelve new unit cases cover independent/double toggles and immutable sources; lock/type/group boundaries; history and local reload; all flip combinations across rotated freeform/ratio trim handles; source-position invariance and screen-direction panning; clamping; reset/reopen/stale-session handling; versioned transfer and independent copies; mixed crop/text-spacing data; SVG nesting/opacity; and Canvas reflection/draw order and source rectangles. These assertions inspect geometry and renderer inputs, not actual image pixels.

Playwright discovers 82 scenarios across 18 files. Six new desktop/mobile scenarios cover menu bounds/navigation/focus/toggling, undo/redo/reload, locks/group exclusion, crop edges/pan/cancel/reset, and SVG/PNG pixel samples for rotated cropped images in all three flipped orientations. The test artwork consists of four original color quadrants generated locally. **These browser cases have not run.** The existing browser runtimes remain unavailable; no new browser tool is exposed. `image-flip-menu.png` is a future capture filename, not an existing screenshot.

## Remaining differences and required captures

Capture original/before/after at 1440×900 and 390×844. Compare button/menu placement, labels, spacing, icons, checked states, keyboard focus, touch targets and viewport edges. Test both axes on an asymmetric image before/after rotation, crop trim/pan/zoom/reset, undo, group-member selection, reload, duplication, clipboard transfer, presentation and SVG/PNG/JPG/PDF export. Verify actual encoded pixels and crop ghost alignment. Keep the row `differs` until those checks establish parity.

Video, editable vector artwork and shaped frames/grids remain separate missing media features; image flipping does not implement their flip behavior. Background-image semantics and exact reference behavior for images inside groups also need direct comparison. There are no paid-plan exclusions or new services in this change. Design/media files stay local; existing hosting, authentication and opt-in analytics are unchanged.
