# Native editor interaction verification and integration review

Date: 2026-10-16. PR #59. Production group/editor behavior is unchanged by these test corrections. Current main is integrated without reverting its auth or public-reference changes.

## Nested selection evidence

At 390px the default text center is (165.25, 552.0365). Native `elementFromPoint` hits the selected pair's rotate-handle circle, whose rectangle is (157.375, 532.5, 26, 26); the original locator's trial click times out. A visible text point at (129.2, 552.0365) hits its tspan. A normal Shift-click delivers a trusted pointerdown at (129.1900, 552.0300) on that text. Desktop's original center already hits text; the alternative also receives trusted input.

All original assertions remain: nested membership, three-level drill-down, member nudge, inner ungroup, parent selection and text editing. Additional checks verify that outer ungroup changes only membership, one Undo/Redo restores exact saved snapshots, and reload preserves the final result. All six group test instances pass, as do both parent comparison flows. No force click, synthetic event, relaxed product assertion or pointer-event override.

## Editor-entry race

The initial general run fails the mobile editor-shell test while the page snapshot shows the dashboard Templates route. Presentation creation persists asynchronously before navigation; an immediate unscoped Templates lookup can click the dashboard's identically named button. The test now waits for the design canvas and selects Templates inside the editor's Tools navigation. Filtering, empty state, clear, collapse, viewport bounds, page creation and reopen assertions remain unchanged. No production navigation change or arbitrary delay.

## Native verification

- Initial [run 38946481233](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38946481233), code `3e46f55fd83e22866eaed656e5d47afc9049b525`: clean install, lint, typecheck, 395 units in 37 files, build pass. **185 passed / 1 failed / 2 skipped** of 188: 96 focused pass, 32 storage pass, 57 general pass, the editor-shell failure and two existing touch-only exclusions. Thirty separate baseline flows pass (20 + 6 + 2 crop + 2 group).
- Final integration [run 38947368400](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38947368400), code `b298941279c444552ac47b2012fb1af3bc51a916`, tree `4faf4a0c19ca41c7454348fb167546c23b9ff3eb`: **186 passed / 0 failed / 2 skipped** of 188 (98 focused, 32 storage, 56 general pass and two existing physical-touch exclusions). Clean install, lint, typecheck, 395 units and build all pass. Includes current main `2784245c91faacbac463a6a0cf0b901fdab960b9` and the navigation correction. Main integration checks omit historical mixed-component baseline rebuilds; the per-PR comparisons above remain retained. No unchanged workflow retry or cancellation was used.

## Retained comparisons

Eight PNGs form four byte/pixel-identical pairs. Four unique images were visually inspected; hashes and pixel equality verify their before counterparts. Font, color, padding, radius, shadow, geometry and accessibility snapshots agree. Saved element state agrees after normalizing randomly generated group identifiers. The mobile rotate-handle overlap is visible in both selection captures. [Raw observations, trusted inputs and hashes](group-selection-controls.json).

| State | Desktop before / after | Mobile before / after |
| --- | --- | --- |
| Selected pair and text | [Before](group-selection-desktop-before.png) / [After](group-selection-desktop-after.png) | [Before](group-selection-mobile-before.png) / [After](group-selection-mobile-after.png) |
| Edited group member | [Before](group-edited-desktop-before.png) / [After](group-edited-desktop-after.png) | [Before](group-edited-mobile-before.png) / [After](group-edited-mobile-after.png) |

These captures compare clone revisions, not the original. Full feature/visual parity, original challenge-blocked references, physical touch dragging and actual Google/email completion remain outside this sign-off. See [the complete inventory](../../PARITY_REPORT.md).

## Merge disposition

All 22 earlier open PR heads were refreshed against the reviewed snapshots, with no new head changes, textual conflicts or requested changes. The six early P1 capacity/handoff threads have fixes in the combined stack (#36–#42), verified by native storage/export/recovery tests. They must ship together, not as the old isolated heads. The #52 mobile badge finding is fixed and resolved.

The complete integration is approved for a merge commit through #59, retaining the individual feature commits and current main. Exact production files match the tested integration; the subsequent evidence commit only adds this report, observations and captures. [Per-PR review](native-merge-review.md#latest-review-and-integration-of-all-23-open-prs-through-59). Full parity remains unfinished.
