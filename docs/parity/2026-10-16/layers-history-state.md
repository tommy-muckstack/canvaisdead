# Preserve Position during Undo and Redo

Date: 2026-10-16. PR [#57](https://github.com/tommy-muckstack/canvaisdead/pull/57), based on #56. This verifies the clone's state correction; no original/clone parity match is claimed.

## Observed problem and change

The mobile Layers pointer case in [parent run 38937130228](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38937130228) completes a real mouse reorder and Undo, then cannot reopen Position. History clears `positionOpen` while leaving `panelOpen` true. Independent native captures now confirm that Undo and Redo replace Layers with Templates at both widths. On mobile the Templates search label covers Position's center.

History still clears transient editing/selection/drag state, and now preserves the Position panel kind and visibility. An open panel retains its selected Layers/Arrange view through Undo and Redo; a collapsed panel stays collapsed. Other explicit panel/page/navigation actions keep their existing close behavior. The production change is restricted to Editor's history/interaction cleanup.

The pointer scenario retains its original insertion-marker, uncommitted-order, committed-order and cancellation assertions. It additionally checks Layers/Position accessibility after keyboard Undo, toolbar Redo/Undo, Escape cancellation while Layers remains open, redo of the committed move after cancellation, and exact saved artwork after reload. A new case verifies Arrange edits with keyboard/toolbar history and the collapsed-panel path. No assertion is weakened or skipped. Mouse events at a mobile viewport do not verify physical touch.

## Completed verification

[Run 38940840699](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38940840699) tests code `42f8a9e131f6b4ecbd560adb5783cad0d027b80f`, tree `0a3085ca02b78964bfe4d948257ea2c061c31a2e`. Clean install, lint, typecheck, **395 unit tests in 37 files**, and production build pass on native Linux CI. Local lint/typecheck/build also pass with the existing dependency overlay.

| Native Chromium partition, 1440 × 900 and 390 × 844 | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Focused editor/library/exports, including every Layers case | 84 | 0 | 0 |
| Storage/handoff | 32 | 0 | 0 |
| General editor | 68 | 2 | 2 |
| **188 regression instances, no overlap** | **184** | **2** | **2** |

All ten Layers instances pass: previews/actions/background, pointer history/cancel/reload, Arrange/collapsed state, keyboard multi-layer/lock handling, and nested reorder boundary protection at both widths. The formerly failing mobile pointer case now reaches its cancellation tail. Twenty-six separate baseline flows pass: twenty parent control captures plus six fixture flows.

Two inherited failures remain: desktop crop reopening (`image-crop.spec.ts:37`) and mobile nested-group member editing (`groups.spec.ts:66`). Their targeting/geometry needs further evidence; these are not newly established product regressions. The two existing skips concern native mouse dragging on mobile. No new failure or skip was introduced; no unchanged run was restarted or cancelled.

## Retained comparison

Eight unmodified PNGs retain Undo and Redo at both widths. All eight were visually inspected. The parent is rebuilt separately with the same fixture and actual mouse reorder, keyboard Undo and toolbar Redo. Both builds persist identical order after each corresponding history step: Undo is a,b,c,d; Redo is b,c,a,d.

| Observation after either Undo or Redo | Parent | Changed |
| --- | --- | --- |
| Position view, both widths | Unmounted; Templates visible | Visible; Layers selected |
| Position expanded state | false | true |
| Desktop side panel | x72, y48, 320 × 852 | Same bounds/styles; Layers replaces Templates |
| Mobile side panel | x64, y96, 320 × 748; full-height Templates overlay | x64, y424, 326 × 420; Position bottom panel |
| Mobile Position center hit | LABEL.cv-psearch; does not receive input | Position BUTTON; receives input |

Position's button geometry, font, color, padding and radius are unchanged: desktop x881/y72 and mobile x78/y104, 70 × 30, 600 14px IsDead Plus Jakarta Sans, rgb(14,19,24), 0px 8px padding and 6px radius. The existing mobile Position styling supplies 12px top corners and its upward shadow; no CSS was changed.

Desktop pixel changes are confined to x6–403/y64–899: 190,087 pixels after Undo and 190,270 after Redo. The canvas/right workspace pixels remain unchanged. Mobile changes cover the removed overlay and restored panel/workspace: 213,972 Undo pixels and 214,490 Redo pixels, within x7–389/y86–843. Raw bounds use exclusive right/bottom coordinates. No image normalization or alteration was used.

| History state | Desktop before / after | Mobile before / after |
| --- | --- | --- |
| Undo | [Before](layers-history-undo-desktop-before.png) / [After](layers-history-undo-desktop-after.png) | [Before](layers-history-undo-mobile-before.png) / [After](layers-history-undo-mobile-after.png) |
| Redo | [Before](layers-history-redo-desktop-before.png) / [After](layers-history-redo-desktop-after.png) | [Before](layers-history-redo-mobile-before.png) / [After](layers-history-redo-mobile-after.png) |

[Raw observations, accessibility snapshots, saved orders, hit targets and pixel comparisons](layers-history-controls.json).

## Remaining scope

Position/Layers/history remain **differs** in the parity inventory: physical units, Tidy up, broader layer controls, physical touch, other browsers and a direct original comparison are unfinished. Independent original requests returned HTTP 403. The crop/group failures still prevent combined-stack sign-off.

No dependency, secret, storage, authentication, billing or deployment setting changes. The existing public-only/read-only workflow restores the parent Editor only for the separate baseline build. PR remains draft/unmerged; main remains `2784245c91faacbac463a6a0cf0b901fdab960b9`.
