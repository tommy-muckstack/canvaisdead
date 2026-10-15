# Layer navigation and ordering — 2026-10-15

## Comparison

The official [Layers guide](https://www.canva.com/help/finding-and-arranging-layers/) documents Position → Layers, selecting page/background/elements, grouped/background indicators, row actions, Shift selection and dragging one or several layers to an insertion line. The official [Japanese layers feature page](https://www.canva.com/ja_jp/features/layers/) also describes an overlapping-layers view. These establish the capabilities, not exact thumbnails, spacing, touch gestures, selection retention or the contents of every menu.

The previous clone had only nested text buttons with lock suffixes. It had no previews, drag targets, per-row actions, overlapping filter or background entry. Position was rendered for a locked single selection but hidden by the toolbar's empty-state class. The clone's source and these reference documents were inspected; no original/clone paired browser capture was obtained.

## Implemented

- Front-to-back rows with artwork thumbnails, group/lock indicators and nested member expansion. Thumbnails use the existing SVG renderer, including crop/flip/text-spacing metadata, and load near the panel viewport. All icons are original SVG/existing project icons; no reference artwork is copied.
- All and Overlapping views. Overlap uses separating axes on rotated element frames, measured text height and line bounds. It includes the selected elements and their direct intersections, including locked artwork; it excludes edge-only contact and transitive neighbors. Filtering retains ancestor groups so their members stay selectable. This geometry is an engineering choice pending direct reference comparison; it does not inspect alpha pixels or exact curved shape silhouettes.
- A background row, selection and local color picker. A common Position button remains available for empty, background and locked selections. Row actions use the editor's existing commands and clipboard guards; right-click and Shift+F10 select the intended row/selection before opening the menu. Dismissal returns focus to the originating row, or the canvas if an action removes it.
- Mouse row dragging and pointer-compatible move handles, insertion lines and automatic edge scrolling. Touch rows keep native scrolling; touch dragging uses the handle. Keyboard handles support Space/Enter pickup, arrow/Home/End placement and Enter/Space drop. Escape, pointer cancellation, lost capture, blur or a changed element array cancel the gesture. A pointer action cancels a pending keyboard move. Other editing shortcuts cannot alter the document during an active keyboard-focused move.
- Reordering commits once at drop, preserving element objects, source bytes, coordinates, crop/flip metadata and group ancestry. Multiple selected siblings keep their relative stacking order. Complete groups move intact; explicitly selected unlocked members can move among their siblings. Locked members make the move atomic/read-only. Cross-parent drops are rejected, not converted into an implicit group change. Stale gestures cannot overwrite newer document edits.
- Existing undo, local saves, reload, backups, clipboard and renderers retain the resulting element order. No schema, portable version, dependency, service, upload, payment, auth, analytics or environment change is added.

## Verification

Lint, typecheck, 307 unit tests across 25 files and production build pass using the existing dependency overlay. A clean dependency installation remains unverified; existing workspace-root, Next ESLint-plugin and Vitest configuration warnings remain.

Thirteen new unit cases exercise both insertion sides, separated multi-selection order, nested groups, parent boundaries, group targets, mixed locks, no-op history, exhaustive single-source/target pairs, direct/rotated/text intersections, escaped/cropped/flipped SVG previews, history/page isolation and local reload/backup/export order. They do not prove actual drag events, focus, scrolling or rendered pixels.

Playwright discovers 100 cases across 20 files. Eight new desktop/mobile cases cover previews, filters, background color and menus; pointer insertion/cancellation/undo; multi-layer keyboard movement and locks; and nested member ordering with invalid parent drops. The existing Position case now uses the readable Ellipse label. **These browser cases remain unexecuted.** Known browser runtime failures persist and no in-app browser tool is exposed. `layers-panel.png` is a future capture filename, not existing evidence. Mouse automation at a mobile viewport is not a verified physical-touch drag.

## Remaining differences and required captures

Capture original/before/after at 1440×900 and 390×844. Compare preview crops, labels/icons, selected/hover/focus states, More menus, filters, group expansion, background behavior and panel scroll/spacing. Exercise single/multiple/nested drag insertion, autoscroll, keyboard cancellation, locks, clipboard, undo/reload and encoded export paint order. Verify long lists and focus after duplicate/delete, mobile touch scrolling/hold/drag and orientation changes.

Cross-group reparenting, automatic group expansion while dragging, exact overlap selection/filter semantics, opaque-pixel filtering, mobile long-press parity and the complete reference action catalog remain unverified/incomplete. Rename and visibility requirements were listed in the earlier inventory without direct reference evidence; no corresponding behavior is invented here. Audit those controls in the real editor before implementing or ruling them out. Full visual/functional parity is not established; keep the report row `differs`.
