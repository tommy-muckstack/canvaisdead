# Editor action names and shortcut descriptions

Date: 2026-10-16. PR: [#49](https://github.com/tommy-muckstack/canvaisdead/pull/49). Parent: #47, `816acca11fbb6e27e86b67f99d880b4bb848cf6c`. Status: **differs**; the naming fix is natively verified, while full original/clone parity remains incomplete.

## Observed behavior and change

The completed parent run failed both locked-layer action scenarios at the exact `Delete` menuitem lookup. Native parent captures now establish why: the accessible names included the visible shortcut, producing **“Delete Delete”**, **“Duplicate Ctrl/Cmd+D”**, and **“Copy Ctrl/Cmd+C”**. The locked Delete action existed and was disabled; the failure did not prove that it was absent or enabled.

Each menuitem is now associated with its visible label, with its existing shortcut exposed separately as the accessible description. Names are **“Delete”**, **“Duplicate”**, and **“Copy”**; browser assertions verify all six shortcut descriptions. IDs are unique per menu instance. Markup order, visible text, roles, checked/disabled state, callbacks, positioning and keyboard handlers are unchanged. The shared image-flip, Uploads and Elements menus retain their labels and state. No paid gate, service, storage, auth, analytics or dependency change is included.

The existing Layers regression captures the locked menu, checks six action names/descriptions, skips disabled Cut during arrow navigation, wraps to Select all and restores the layer trigger on Escape. Its previously blocked tail now duplicates a text layer through the menu and verifies background edits after save/reload. The canvas context-menu regression uses exact names and verifies shortcut descriptions while preserving right-click, Shift+F10, Home/End, arrow, Escape, focus, viewport and ungroup assertions. No original assertion is dropped, forced or given more time.

## Native verification

Tested code: `eedb6645de56fc4652f91505eb769a5e726bf042`, tree `c3978c4f3e28c3d1f10a3f6bcbb9b6a1b74ee9b1`. Completed [run 38912688789](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38912688789) performs a clean install on Node 24.12 and passes lint, typecheck, **388 unit tests in 37 files**, and production build. Local checks also pass with the documented dependency overlay.

Chromium runs at **1440 × 900** and **390 × 844**:

| Job | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Focused menu / Create / editor / downloads, 117012201646 | 46 | 0 | 0 |
| Storage / recovery / handoff, 117012201187 | 32 | 0 | 0 |
| General editor / library, 117012201456 | 72 | 24 | 2 |
| **All 176 regression instances** | **150** | **24** | **2** |

All four Layers/context-menu instances pass. The two previously failing locked-layer cases are resolved; the remaining failure list contains no newly failing scenario relative to #47's completed run. Ten separate parent capture flows pass and are excluded from the regression count. The four menu instances moved into the focused job without changing the total inventory; the three jobs have no overlapping test selection.

The remaining 24 failures include test/fixture problems and interactions requiring investigation, not 24 established product regressions. They still cover recovery/library alerts, clipboard PNG setup, guest empty-state setup, Elements filters/drop placement, mobile group/layer interactions, desktop cropping, mobile library/Trash navigation, presentation and upload coordinates. No full-stack sign-off or merge.

## Retained comparison

Before captures rebuild the parent's `EditorContextMenu` in the disposable CI checkout. After captures use the changed component. All four original PNGs were retained and visually inspected; files below contain the exact screenshot bytes from job 117012201646. Generated local fixtures supply the artwork; no production design content is used.

| Viewport | Before | After |
| --- | --- | --- |
| Desktop | [PNG](context-menu-desktop-before.png) | [PNG](context-menu-desktop-after.png) |
| Mobile | [PNG](context-menu-mobile-before.png) | [PNG](context-menu-mobile-after.png) |

[Computed styles, accessibility snapshots, focus/disabled state, pixel comparison and provenance](context-menu-controls.json).

Recorded geometry, font, color, padding, gaps, radius, shadow and control states agree for both pairs. The menu measures **280 × 501.78125 px** at desktop and **280 × 601 px** at mobile, with 6px padding and an 8px radius. The mobile full-page images are pixel-identical. The desktop pair differs by three pixels, maximum channel delta 1/255, at x84–85/y171–172 on the Layers filter border, outside the menu; the menu itself is pixel-identical. The cause of that tiny external paint difference is not established.

These are parent/changed clone captures, not a comparison with the original application. Browser accessibility snapshots and description assertions do not establish how each screen reader announces the menu.

## Remaining gaps

Full original action catalog, nested submenus, long-press behavior, platform-specific shortcut rendering and exact original/clone appearance remain unverified/incomplete. Mobile Layers pointer reordering still fails later in its separate flow; it is not resolved by this naming change. Full screen-reader and physical touch-device behavior remain unverified. Context menu and Layers remain **differs** in the parity report.
