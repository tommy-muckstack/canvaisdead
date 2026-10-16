# Preserve Position during Undo and Redo

Date: 2026-10-16. Follow-up based on #56. Native before/after verification is pending; no original/clone parity match is claimed.

## Observed problem

The mobile Layers pointer case in [parent run 38937130228](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38937130228) completes a real mouse reorder and Undo, then cannot reopen Position: its button has aria-expanded=false and Templates' search label intercepts the click. Source inspection shows that history clears positionOpen while leaving panelOpen true. The mobile Position bottom panel consequently becomes the full-height Templates overlay.

## Change and checks

History still clears transient editing/selection/drag state, and now preserves the Position panel kind and visibility. An open panel retains its selected Layers/Arrange view through Undo and Redo; a collapsed panel stays collapsed. Other explicit panel/page/navigation actions keep their existing close behavior.

The original pointer scenario now asserts that Layers stays open and Position receives pointer input after keyboard Undo, verifies toolbar Redo/Undo, exercises Escape cancellation without closing Layers, redoes the committed reorder after cancellation and checks exact saved artwork after reload. A new case covers Arrange edits with keyboard/toolbar history and the collapsed-panel path. No assertion is weakened or skipped.

Independent parent captures perform the same native reorder, keyboard Undo and toolbar Redo, recording the panel kind, active tab, accessibility snapshot, visible row order, Position hit target, geometry/styles and screenshot at 1440 × 900 and 390 × 844. These mouse events at a mobile viewport are not physical-touch verification.

## Verification

Local lint, typecheck and production build pass using the existing dependency overlay. Playwright discovers 188 regression instances: 84 focused, 32 storage and 72 general cases, without overlap. Native execution and retained captures are pending. Ten Layers cases run in the focused job. Twenty-six separate baseline flows are expected (twenty control captures plus six fixture flows).

No dependency, secret, storage, authentication, billing or deployment setting changes. The existing public-only/read-only workflow restores the parent Editor only for the separate baseline build. Crop reopening, mobile nested-group targeting, physical touch behavior and full reference comparison remain outstanding. Independent original requests returned HTTP 403; the clone-only improvement does not establish full parity.
