# Multiple-element selection — 2026-10-15

## Compared

The official [moving elements guide](https://www.canva.com/en_gb/help/moving-elements/) documents Shift selection, moving selected elements together, keyboard nudging and lock protection. The [group/layer/alignment guide](https://www.canva.com/help/layer-group-align/) describes drag selection, grouping, relative alignment for multiple elements and stacking controls. The [keyboard shortcut guide](https://www.canva.com/en_gb/help/canva-keyboard-shortcuts/) includes the F8 selection-mode toggle in search retrieval. These are written references; exact desktop/mobile interaction and geometry have not been observed in a working browser.

The clone previously held one selected element ID. Each click replaced it. There was no selection rectangle, multiple-element toolbar or bulk editing; keyboard movement, duplication and deletion only applied to one object.

## Implementation

- Selection membership is independent of design content and resolved in stacking order. Shift-click toggles a member. Blank-canvas/stage dragging selects intersecting rotated element boxes; Shift-marquee adds to the selection. Ctrl/Cmd+A selects unlocked elements on the active page, while F8 toggles selection mode when something is selected.
- Select multiple/Done supports tapping objects without a modifier key; the same mode works in Layers. Transformation handles are hidden during selection mode. Single locked elements remain selectable for unlocking, but marquee/select-all exclude them. Mixed explicit selections indicate that they include locked objects.
- Movement/nudging applies one delta to every unlocked member. Snapping uses the movable selection's union, excluding its members as snap targets. Alt bypasses snapping. Locked objects remain fixed. Duplication creates new independent IDs, retains relative stacking order and copies media/styles/locks. Delete retains locked originals.
- Bulk Position aligns within the selection's bounds and moves selected layers forward/backward/front/back in stable order. Opacity affects unlocked members; explicit Lock/Unlock affects all selected members. An all-locked selection disables destructive/edit controls.
- Corner handles uniformly scale relative geometry, type, strokes and radii around the opposite corner. Rotation uses the selection's bounds center, with 15-degree snapping unless Alt is held. Mixed locked selections hide transform handles and the model also refuses partial resize/rotation. Existing single-object text reflow/rotation tools remain available.
- Pointer motion is a transient preview. Pointer-up uses the latest preview reference and commits once, including the final pointer coordinates. A three-screen-pixel threshold separates a click from a drag. Escape, pointer cancellation, lost capture or window blur discard the draft and restore pre-gesture selection. Page/history changes clear interaction state. Native input/text editing and page-thumbnail navigation retain their keyboard behavior.
- Geometry and content remain in the existing local document format. No selection metadata is persisted or exported, no new dependency/service is added, and files remain in the browser or local downloads.

## Checks and outstanding browser evidence

Unit tests cover selection toggling/stale IDs, reverse marquees, rotated-box intersection instead of only bounding-box overlap, measured text extents, snapping without self-targets, fixed anchors during uniform scaling, type/stroke/radius scaling, lock protection, shared rotation, stable stacking, relative alignment, independent copies, JSON/SVG output, page isolation and one-step undo/redo. Typecheck initially caught an insufficiently narrowed gesture union; the explicit rotation branch fixes it.

`npm run lint`, `npm run typecheck`, all 210 unit tests across 18 files, and `npm run build` pass. Checks use the previously documented dependency overlay; clean installation is still unverified. Existing workspace-root, Next.js ESLint-plugin and Vite configuration warnings remain. Playwright discovers 46 cases across 13 files.

Four new Playwright scenarios run at both configured widths (1440×900 and 390×844): Shift selection/keyboard edits/reload; marquee/group movement/Escape cancellation; touch selection and bulk locking; and multi-element scaling/rotation with undo. They produce screenshot paths for multi-selection and duplicate/cancel states. Discovery is not execution.

Browser tools remain unavailable and the previously recorded local browser launch failures are unchanged. No new original/before/after captures or computed styles were produced. To verify, run those scenarios and capture the same selection at both widths in the original and clone; include mixed locked selections, selection-mode controls, alignment/stacking, mobile scrolling, focus, final-pointer/cancel events and the saved result after reload. No visual-match status is claimed.

## Remaining work

Selection is not a persisted group. Group/ungroup, nested group editing, grouping shortcuts and group-specific transforms remain absent. Multiple text objects do not yet expose mixed font/formatting controls. Nonuniform multi-resize, cross-page dragging, distributing/tidying, keyboard cycling between elements and full context menus remain missing. The current union outline stays axis-aligned during rotation; exact reference outline behavior and pivot retention require comparison. Hit areas use rotated layout boxes rather than shape contours or complete stroke extents; the reference's marquee inclusion, locked-selection and touch gesture rules still need observation. These are gaps, not paid-feature exceptions.
