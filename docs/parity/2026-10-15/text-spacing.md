# Text spacing and anchors — 2026-10-15

## Comparison

The official [format-text guide](https://www.canva.com/help/format-text/) describes letter/line sliders under Advanced Settings. The [text-anchor guide](https://www.canva.com/help/anchor-text-canva/) describes start, middle and end anchoring for predictable reflow. The [rich-text API documentation](https://www.canva.dev/docs/apps/api/latest/design-create-richtext-range/) specifies letter spacing in em (−0.2 to 0.8, displayed ×1000) and line height in em (0.5 to 2.5, default 1.4). These establish controls, units and behavior; they do not establish a screenshot or computed-style match.

The clone previously displayed an unsupported toast for Spacing. It could render stored line heights but offered no UI, character tracking or text anchors.

## Implemented

- A compact Spacing popover supplies letter/line sliders and numeric fields, and start/middle/end anchor buttons. It provides pressed/invalid states, keyboard controls, outside dismissal and focus return on close/Escape. Mobile has a bounded, scrollable popover. Native controls and original SVG anchor icons add no dependency or licensed asset.
- Changes preview without saving. Release, Enter or blur commits one history step; Escape discards the active preview. Outside pointer activation commits before another canvas handler captures a document for dragging. Invalid or empty numeric entries preserve the saved value. Locked objects cannot be changed.
- Tracking is stored relative to font size and scales with single/group/canvas resizing. Text wrapping, selection geometry, SVG, Canvas, decorations and the editing textarea consume it. Native Canvas letter spacing preserves whole-line shaping. Older implementations use approximate tracking for layout and give an explicit SVG fallback for raster export, avoiding silently altered downloads. See the [Canvas API compatibility notes](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/letterSpacing).
- Anchors keep a text box's start, middle or end fixed when content, width, font or spacing changes its measured height, including rotation. Side handles keep the opposite horizontal edge and chosen vertical anchor; corners keep the opposite corner. Switching anchor alone does not move artwork. Text editing previews growth/rotation and commits on blur/Escape. Group membership remains intact.
- New editor text boxes and plain-text pastes use 1.4 line spacing. Existing designs and authored templates keep their values; legacy missing line heights retain the prior 1.2 fallback. This avoids silently reflowing stored artwork.
- Local persistence, undo/redo, page/library/group copies and clipboard retain the new fields. Backup version 5 and clipboard version 3 reject unsupported transfers into older clients; older formats still work without the fields. No file upload, service, payment/auth/telemetry or credential change. Older app versions reading the same unversioned local library can still ignore unknown fields; portable versioning does not solve that existing downgrade limitation.

## Verification

Lint, typecheck, all 266 unit tests across 22 files and the production build pass. Added tests cover positive/negative tracking, grapheme preservation, explicit blank lines, wrapping/selection height, native metric reset, old-Canvas layout/export behavior, anchors across several rotations and typography changes, side/corner resizing, locks/no-op edits, history, local reload, backup/clipboard versions, independent copies and matching SVG/Canvas line/baseline/decorations inputs. Existing workspace-root, Next ESLint-plugin and Vitest configuration warnings remain.

Playwright discovers 76 scenarios across 17 files, including eight new cases covering numeric preview/commit/cancel/validation, keyboard sliders, undo/redo/reload, anchored typing, SVG export, outside-click/drag ordering and locks at 1440×900 and 390×844. **Browser execution remains unavailable.** `text-spacing-controls.png` is a future output path, not screenshot evidence. Unit draw-call checks do not establish actual glyph or encoded-pixel parity. Checks use the documented dependency overlay rather than a verified clean install.

The owner requested review and merge of open PRs. Code review found that Escape restored focus while React still had the spacing inputs mounted, allowing their blur handlers to commit the cancelled preview. Dismissal now flushes cancellation and unmounts the panel before restoring focus. A focused-number/held-arrow slider regression case covers both spacing controls at both widths; it is discovered but has not run in a browser. No claim of reproduced browser behavior is made.

## Remaining differences and required captures

The current reference docs place these controls in Advanced Settings/More settings; the clone exposes them directly through Spacing. Panel appearance, default selections, touch/pointer capture, keyboard focus, exact glyph baselines, line-height bounds/ink overflow and raster/SVG pixel agreement still need direct comparison. Native Canvas support is required for tracked raster text; older-browser measurement is approximate. The existing late-font editor refresh, tabs, bidi/language-specific wrapping and shaping across line breaks remain gaps.

Paragraph-specific spacing, mixed paragraph/character formatting, lists, justification, kerning/ligature toggles, superscript/subscript and the rest of Advanced Settings remain required work, not paid exclusions. This PR implements whole-element spacing and anchoring without claiming those features.

Capture original/before/after controls at both widths. Exercise positive/negative tracking, line-height extremes, rotated/grouped text, typing and width resizing under each anchor, long Unicode text, repeated pointer/keyboard adjustments, pointer cancellation, viewport edges and reload. Compare resulting SVG/PNG/JPG/PDF text and presentation previews with editor output using actual loaded fonts. Keep the rows `differs` until this evidence establishes a match.
