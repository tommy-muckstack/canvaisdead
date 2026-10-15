# Position controls — 2026-10-15

## Comparison

The official [moving-elements guide](https://www.canva.com/help/moving-elements/) places numeric X/Y under Position → Advanced and defines them in pixels relative to the canvas top-left. The [resize guide](https://www.canva.com/help/resize-and-crop/) documents Width/Height and Ratio in the same section. The [layer/alignment guide](https://www.canva.com/help/layer-group-align/) describes four stacking directions, page alignment for one selected element and selection-relative alignment for several elements. The [rotation guide](https://www.canva.com/help/flip-and-rotate/) also documents a numeric Rotate field in Position.

These sources establish workflow, not exact panel typography, dimensions, pivot conventions, Layers layout, distribution rules or mobile behavior. The owner’s editor composite does not show an open Position panel. No paired screenshots or computed styles are available.

Before this change, Position opened a compact popover with alignment and stacking. Exact size, coordinates, rotation fields and distribution were absent. Layers was a simple nested list inside Elements. Single-object alignment used unrotated dimensions, leaving visibly rotated artwork offset from page edges.

## Implemented

- Dedicated Arrange/Layers tabs in the existing side panel, with a mobile bottom sheet. Arrange includes Forward, Backward, To front, To back, six alignment actions, equal horizontal/vertical spacing and Advanced fields. Layers reuses nested group/member selection and lock indicators. A context-menu Position action provides access even without a selection. Original SVG alignment icons use the existing type/color system; no licensed reference assets or new dependency is added.
- Numeric fields accept fractional values. Enter/blur commits once; invalid entries reset without a history entry. Escape first cancels a dirty field and then closes the panel. Arrow Up/Down changes the draft by one, or ten with Shift. A capture-phase blur commits before a canvas drag takes its snapshot. Tabs support arrow/Home/End navigation; arrows on panel buttons do not nudge artwork. Close restores toolbar/canvas focus.
- Single objects expose their stored frame X/Y, local width, measured height and normalized absolute rotation. Resizing holds the visible local top-left corner; text instead keeps its chosen vertical anchor along the left edge. Image frame edits preserve bytes, crop windows and flips. Unlocked-ratio text width reflows; locked-ratio text scales its font. Line height stays read-only. These pivot and rotated-coordinate conventions require direct reference verification.
- Multi-selections and complete groups use their axis-aligned union. Numeric width/height uniformly scale the members; **Rotate by** explicitly applies a relative angle about the union center. Mixed-lock selections cannot be partially transformed. An explicitly selected unlocked member remains editable inside its group. Ratio is fixed for multi-selection; single images default to locked, single text/shapes to unlocked. Defaults also require reference comparison.
- Single objects and complete groups align visible rotated bounds to the page; multiple units align within their union. Locked units stay in place. Distribution treats complete groups as units, equalizes edge gaps and retains first/last units; overlapping layouts can produce negative gaps. A locked unit disables distribution. This distribution algorithm is an implementation choice pending direct comparison.
- All changes use existing immutable edits, one-step history and local save paths. Stored precision is retained; field display rounds to three decimals. Dimension input spans 0.01–1,000,000 pixels, with signed coordinate/angle input limited to 1,000,000. Text fonts cannot scale below 8; existing multi-scale minimums still apply. Oversized resulting dimensions are rejected. These are implementation limits, not plan restrictions.

## Verification

Lint, typecheck, 294 unit tests across 24 files and production build pass using the previously documented dependency overlay. Clean installation remains unverified. Existing workspace-root, Next ESLint-plugin and Vitest configuration warnings remain.

Sixteen new unit cases cover fractional/negative coordinates, normalized/no-op rotation, rotated resize anchors, image crop/flip preservation, text reflow/scaling/anchors, line dimensions, invalid/extreme values, proportional group transforms, mixed-lock protection, all six rotated alignment directions, equal gaps with unequal/overlapping/grouped artwork, local persistence, page isolation, undo/redo, backup/clipboard and SVG geometry. They verify model behavior and output structure, not rendered pixels.

Playwright discovers 92 cases across 19 files. Ten new desktop/mobile scenarios cover commit/cancel/validation, ratio/rotation and reload; commit-before-drag and undo; tab/layer selection and stacking; rotated alignment; multi-scaling/distribution; read-only locked/text fields; and access without a selection. **These browser tests have not run.** The known browser launch failures remain; no browser tool is exposed. `position-advanced.png` and `position-layers.png` are future capture names, not existing screenshots.

## Remaining differences and required captures

Capture original/before/after at 1440×900 and 390×844. Measure panel width, section/tab order, button/icon alignment, field units, borders, spacing, fonts, selection/disabled states, focus, scrolling and touch targets. Verify exact values/pivots on rotated shapes, text, cropped/flipped images, nested groups and mixed-lock selections. Exercise tab/arrow keys, Escape/Enter/blur, pointer commit ordering, viewport changes, undo/reload, alignment, distribution, clipboard, backups and encoded exports.

Absolute group orientation needs persistent oriented group geometry; **Rotate by** is not an equivalent replacement. Physical units, nonuniform multi-scaling, Tidy up, image-pixel stretching, text behavior for all font/writing systems, and precise reference pivots remain unfinished. Layers still lacks thumbnails, drag ordering, rename, visibility and filtering. Video, vectors, grids and other unimplemented element types also require their own Position behavior. These are backlog differences, not waived paid features.

No service, upload, dependency, payment/auth/analytics or environment change is included. Designs and media remain local. Keep these report rows `differs` until the outstanding behavior and paired captures establish parity.
