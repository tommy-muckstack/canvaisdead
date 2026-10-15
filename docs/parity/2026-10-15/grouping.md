# Persistent grouping — 2026-10-15

## Compared and implemented

The official [group, layer and align guide](https://www.canva.com/help/layer-group-align/) describes grouping a selection, clicking through to edit members while retaining a group, ungrouping the full group or removing one member, and Ctrl/Cmd+G. It distinguishes page alignment from alignment between selected items. This is written workflow evidence, not a controlled screenshot comparison. The previous clone only retained a transient list of selected element IDs.

Group/Ungroup now appears on the floating toolbar. Ctrl/Cmd+G groups and Ctrl/Cmd+Shift+G ungroups. Selecting a member selects its group; a subsequent click enters that group. Nested groups can be entered one level at a time. Dragging a selected group moves the whole group; click-through only happens after a click with no drag. Escape/Select parent group returns to the parent. Text editing, resize, rotate, movement and formatting of explicitly selected members retain membership. Layers exposes expandable nested membership with native controls.

Complete groups are units for marquee/Shift/touch selection, duplication, movement, alignment and stacking. One selected group aligns to the page; multiple selected units align relative to their union without collapsing the group’s internal layout. Grouping separated layers makes a contiguous block at the frontmost selected layer. Member reordering/duplication remains inside its parent. Removing a member collapses one-child groups. A group containing locked content cannot be partially moved, deleted, aligned, resized, rotated or faded; explicitly selecting an unlocked member still allows editing it. Explicit Lock/Unlock remains available for the whole selection.

The document keeps flat artwork geometry plus page-local ancestry arrays. Validation rejects invalid IDs, duplicate ancestors/cycles, inconsistent parentage, interleaved group blocks, one-child groups and depth over 32. Group/page copies use independent IDs; imported libraries copy ancestry arrays so editing a copy cannot mutate an original. Grouped backups use version 3, which older app versions reject. Ungrouped backups still use version 2; versions 1/2 remain importable. Existing browser libraries without groups need no migration. Editing grouped documents in an older app version remains unsupported because that version does not enforce group invariants.

Every completed grouping or bulk operation uses the existing document history and local save recovery. Cancelling a pointer gesture restores the prior group editing context. Page/history navigation clears it. No service, upload, dependency, environment variable, authentication provider, payment gate or telemetry change is introduced. JSON backups preserve editable membership; artwork exports continue to render the same geometry without editable group metadata.

## Verification

- Lint and typecheck: pass.
- Unit suite: 226 tests across 19 files pass. New cases cover nested selection/grouping, member detachment, layer packing, immutable inputs, malformed imports, lock protection, whole-unit alignment, independent nested copies, page isolation, undo/redo, backup versions and local guest handoff. Existing malformed-library recovery tests also pass after making backup version detection safe for invalid recovery input.
- `npm run build`: pass. Existing workspace-root and Next.js ESLint-plugin warnings remain; checks use the documented matching dependency overlay, not a verified clean install.
- `npm run test:e2e -- --list`: 52 scenarios discovered across 14 files at desktop/mobile widths, including six new grouping scenarios. Discovery does not execute a browser. `git diff --check` passes.
- Browser execution remains unavailable in this environment. The new desktop/mobile scenarios are not executed. They exercise grouping after reload, independent duplication/undo, nested member selection/text editing, parent navigation and mixed-lock protection. Their screenshot targets are `group-created.png` and `group-member-edit.png` in Playwright’s per-project output directory, not existing evidence.

## Remaining differences and required captures

Group outlines and transform handles still use an axis-aligned union of member boxes. Successive rotations recalculate the pivot rather than retain an oriented group transform. Selecting/dragging from empty space between members, group names, context-menu group actions, richer group formatting and exact nested-layer presentation remain unfinished. Supported artwork types can group; charts, tables, grids, sheets and app content need their separate missing editor implementations.

The primary guide establishes member-editing behavior, but exact nested-group UX, grouping layer placement, lock semantics, keyboard conventions and 32-level behavior still require direct reference comparison. These choices are current implementation decisions, not asserted matches or justified exceptions. Capture original/before/after at 1440×900 and 390×844: grouped versus member outlines, floating controls, Layers, touch selection, cancelled dragging, rotations, overlapping elements and mixed locks. Verify focus, keyboard/touch controls, save recovery and reload in a working browser before changing the report to `match`.
