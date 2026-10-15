# Local image cropping — 2026-10-15

## Comparison

The official [resize and crop guide](https://www.canva.com/en_in/help/resize-and-crop/) describes toolbar/double-click entry, freeform or predefined aspect ratios, dragging crop handles, resizing content within the crop, and Done/outside-click completion. It explains that hidden content remains recoverable. This is workflow evidence, not a controlled screenshot comparison. The clone previously rendered centered image cover windows with no crop controls or saved source window.

## Implemented

- Crop is available for an unlocked image from the toolbar, context menu or double-click. Group members can be cropped without losing membership. The panel offers Freeform, Original, common landscape/portrait ratios, zoom, reset, Cancel and Done. The preview displays recoverable source content outside the crop, thirds guides and eight crop handles. Mobile uses a compact panel; visual sizing/focus remain unverified.
- Crop handles trim/reveal the source while retaining its page-space pixel positions, including on rotated images. Ratio presets preserve pixel scale while changing the frame; subsequent handle drags retain the selected ratio. Dragging the image repositions the source within its fixed frame. Handles and repositioning support arrow keys, with Shift for larger steps. Pointer cancellation/lost capture or window blur cancels the active gesture.
- Preview changes are not autosaved. Done/Enter/outside click commits one document history step; Cancel/Escape discards the preview. Source bytes, rotation, opacity and groups are preserved. Reset reveals the full embedded source fitted within the current bounds. The source is the existing embedded upload, including any resizing performed at upload, not a new copy of the original disk file.
- Source rectangles are bounded and validated on library/backup/clipboard reads. Copies clone the crop metadata independently. Cropped backups use version 4 and cropped clipboard payloads version 2; earlier data formats remain supported for uncropped content. Older app versions reject the new formats instead of silently discarding crops. The existing local-storage downgrade limitation still applies.
- SVG uses a nested clipped viewport with the complete source image. Canvas raster rendering uses the corresponding visible source rectangle, including cover behavior after a changed frame aspect. Existing PNG/JPG/PDF export and presentation paths consume these renderers. No remote media fetch, new service, dependency, authentication/payment/telemetry or environment change is added.

## Verification

Lint, typecheck, all 255 unit tests across 21 files and the production build pass. New tests cover centered initial crops, every handle at several rotations, extreme drags/bounds, ratio preservation, pan direction, zoom/reset, locked/no-op operations, one-step history, local reload, stale source protection, malformed/versioned data, independent copies, SVG viewport output and actual raster draw arguments. Renderer draw-call tests do not establish visual or encoded-pixel parity. Existing workspace-root, missing Next ESLint-plugin and Vitest configuration warnings remain. Checks use the documented dependency overlay, not a verified clean install.

Playwright discovers 66 scenarios across 16 files at 1440×900 and 390×844, including six new crop cases. They cover toolbar/double-click entry, unsaved preview, ratios/zoom, Done/Cancel, keyboard/pointer interaction, locks, reset, undo/redo/reload and SVG/PNG downloads. The PNG scenario checks the resulting center pixel against original two-color test artwork generated in the browser. **These scenarios are not executed:** the browser runtime remains unavailable. `image-crop-settings.png` and `image-crop-applied.png` are future test output paths, not screenshot evidence.

## Remaining differences

Internal image rotation/straightening, free stretching, subject-aware Smart Crop, shaped frames/grids, background images, non-raster media cropping and the separate photo editor remain required work. Zoom controls normally allow 1–10× full-source fit and retain a larger range for existing tighter crops. Reset behavior, preset catalog, crop overlays/handles, outside-click focus, touch interaction and all exact reference geometry need direct comparison. No paid-tier exclusion is treated as an exception.

Capture original/before/after crop controls and handles at both widths, including rotated/grouped/locked images, viewport edges, touch gestures, pointer cancellation and loading failures. Compare SVG and PNG/JPG/PDF pixels after cropping/reload and clipboard/page/design copies. Keep status `differs` until these checks establish a match.
