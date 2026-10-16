# Editor action names and shortcut descriptions

Date: 2026-10-16. Parent: PR #47, `816acca11fbb6e27e86b67f99d880b4bb848cf6c`. Status: **differs**; native verification is pending.

## Evidence and change

The completed parent run fails both locked-layer action scenarios at the exact `Delete` menuitem lookup. Source inspection shows the visible action and its `<kbd>` shortcut both contribute to the unlabelled button. The planned parent accessibility capture will establish the browser's actual names; this is not yet a screen-reader observation or an original/clone comparison.

Associate each menuitem with its visible label and expose its existing shortcut as the accessible description. IDs are unique per menu instance. Keep the same markup order, visual text, roles, checked/disabled state, callbacks, positioning and keyboard handlers. This also covers the shared image-flip, Uploads and Elements menus. No paid gate, service, storage, auth or dependency change is included.

The existing Layers regression now captures the locked menu, checks six action names/descriptions, skips disabled Cut during arrow navigation, wraps to Select all, restores the layer trigger on Escape, duplicates a text layer and persists background edits. The existing canvas context-menu regression uses exact names and verifies shortcut descriptions while preserving right-click, Shift+F10, Home/End, arrow, Escape, focus, viewport and ungroup assertions. No original assertion is dropped, forced or given more time.

## Verification

Local lint, typecheck, all 388 unit tests in 37 files and production build pass using the documented dependency overlay. Native Chromium at 1440 × 900 and 390 × 844 will use the existing public Linux workflow because local browser bootstrap remains unavailable. The four Layers/context-menu instances move into the focused job; all 176 regression instances remain partitioned as 46 focused, 32 storage and 98 general, with no overlap. Ten separate parent capture flows are excluded from that count.

Before captures rebuild the parent's `EditorContextMenu` in the disposable CI checkout. After captures use the changed component. Both include full-page PNGs, computed menu/button styles, focus/disabled state and accessibility snapshots. Capture scripts use only generated local fixtures and never send production design content to CI.

## Remaining gaps

Full original action catalog, nested submenus, long-press behavior, platform-specific shortcut rendering and exact original/clone appearance remain unverified/incomplete. Native browser accessibility snapshots do not establish how each screen reader announces descriptions. Layers pointer/touch reordering and the other unresolved browser failures remain separate work. This change must not mark the whole Context menu or Layers rows as a match.
