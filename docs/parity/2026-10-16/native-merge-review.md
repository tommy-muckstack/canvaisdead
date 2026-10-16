# Native browser review of PRs #35–#58

Date: 2026-10-16. Decision: **leave the dependent stack unmerged**. The owner authorized merging acceptable PRs; this is a verification decision, not a request for more permission.


## Follow-up verification of visible crop reopening (#58)

[Final run 38944081289](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38944081289), code `d3a11b18500ecd7465bec5d4489722c6b866acff`, passes clean install, lint, typecheck, 395 units and build. Native totals are **185 passed / 1 failed / 2 skipped** of 188: 90 focused, 32 storage and 63 general passes. Twenty-eight separate baseline flows pass.

All eight crop instances pass. Native measurements establish that the old desktop locator chooses 720,450 from a huge clipped source quad and hits the background; the actual visible-frame center hits the image. A normal native double-click there reopens the crop with unchanged saved source/crop state. Reset preview/commit, reset Undo/Redo/reload, locks/cancellation and output pixels pass. Production is unchanged. An initial instrumentation assertion incorrectly expected the double-click target to remain the image; after the initial run finished, it was corrected to observe image pointerdowns and the canvas-retargeted double-click, retaining trust, underlying hit and coordinate checks.

Eight retained PNGs form four byte/pixel-identical pairs. Four unique images were inspected; corresponding geometry/styles/accessibility and input records match. The mobile crop section extends below its initial visible viewport; reaching Reset/Done in the native flow does not establish exact touch/layout parity.

**One regression failure remains:** mobile nested-group member editing at `groups.spec.ts:66`. Its event target/action stage still needs native investigation. The final run introduces no new failure or skip. The combined stack stays unmerged; this is not a new review of every open PR. Main remains `2784245c91faacbac463a6a0cf0b901fdab960b9`. [Full evidence, both run summaries and captures](crop-visible-frame.md).

## Follow-up verification of Position history (#57)

[Run 38940840699](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38940840699), code `42f8a9e131f6b4ecbd560adb5783cad0d027b80f`, passes clean install, lint, typecheck, 395 units and build. Native totals are **184 passed / 2 failed / 2 skipped** of 188: 84 focused, 32 storage and 68 general passes. Twenty-six separate baseline flows pass.

All ten Layers cases pass, including the formerly blocked mobile pointer/cancellation tail. Native parent captures prove that Undo/Redo clears Position and lets Templates cover the mobile trigger. The fix preserves the open Position view and collapsed visibility through history. Additional checks cover Arrange edits, toolbar/keyboard history, Escape cancellation, redo after cancellation and exact saved reload. Eight inspected screenshots and computed hit targets/accessibility record the correction at both widths; the desktop canvas pixels remain unchanged.

**Two failures remain:** desktop crop reopening and mobile nested-group member editing. No newly failing scenario or skip was introduced. Source geometry suggests targeting issues, but native measurements are still required before classifying them. The combined stack remains unmerged, and this follow-up is not a new review of all twenty-one PRs. Main remains `2784245c91faacbac463a6a0cf0b901fdab960b9`. [Full evidence and screenshots](layers-history-state.md).

## Latest review of all 20 open PRs, through #56

The owner again authorized reviewing and merging acceptable changes. Refreshed all twenty heads, base branches, Git trees, checks, inline threads and submitted reviews. Every tree exactly matches its locally reviewed snapshot. #35–#55 are unchanged since the prior review; re-inspected #56's test/helper/workflow delta and its completed native results. All current head secret scans pass, and GitHub reports no textual merge conflict. Only #35 targets main; the other nineteen PRs form a dependency chain.

**Decision: no additional merge.** Earlier heads omit necessary later persistence, handoff and rendering fixes. The combined stack still has three failed native interactions. The draft flag is not the reason, and no additional permission is required. Merging a later PR into main would also include its unresolved ancestors.

Latest tested code is `3b4e4993785a48fda4ba7784a56957a60864a832`, tree `1b5233b32cc55b935d958cce6f31ccddec8576bc`. [Completed run 38937130228](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38937130228) passes clean install, lint, typecheck, **395 unit tests** and build. Browser results are **181 passed / 3 failed / 2 skipped** of 186: 76 focused passes, 32 storage passes, and 73 general passes / 3 failures / 2 skips. Twenty-four separate baseline flows pass. The reviewed #56 head `545f85cecb60eb08e4d81bae49172f739a80e790` only adds evidence/documentation to that tested code; its green secret scan does not supersede the failed browser job.

Remaining findings:

- **Position/Layers after Undo:** history calls `clearInteraction()`, which clears Position but leaves the side panel open. The mobile flow exposes Templates over the toolbar, blocking Position reopening and the later drag-cancellation check. A local, unpublished fix is in progress; it is excluded from this PR sign-off.
- **Desktop crop reopening:** after crop, Undo/Redo and reload, the image double-click is intercepted by the canvas background. Reopening/reset assertions remain unverified; actual cropped hit geometry must distinguish a targeting problem from product behavior.
- **Mobile nested groups:** the member-edit scenario times out. Direct native action/geometry evidence is still needed to identify the cause and reach its remaining membership/edit assertions.

These are three failing test instances, not three proven regressions introduced by this stack. No assertion was removed, skip added, workflow rerun or production change made for this review.

| PR | Reviewed remote head | Disposition |
| --- | --- | --- |
| [#35](https://github.com/tommy-muckstack/canvaisdead/pull/35) | `7b49affd7f64` | Cannot ship alone: needs later design persistence, backup, guest handoff and bounded rendering fixes. |
| [#36](https://github.com/tommy-muckstack/canvaisdead/pull/36) | `6a99a04b5d50` | Cannot ship alone: needs bounded handoff (#39) and Blob-backed records (#42). |
| [#37](https://github.com/tommy-muckstack/canvaisdead/pull/37) | `2fb321f8721d` | Upload handoff passes in combined stack; retains earlier dependencies. |
| [#38](https://github.com/tommy-muckstack/canvaisdead/pull/38) | `07695dd935a8` | Upload backup/restore passes in combined stack; retains earlier dependencies. |
| [#39](https://github.com/tommy-muckstack/canvaisdead/pull/39) | `a8f4aa0cbdcd` | Large handoff passes with #42; this head alone lacks its record-size fix. |
| [#40](https://github.com/tommy-muckstack/canvaisdead/pull/40) | `9df89bc4ad02` | Large artwork rendering/reopening/export passes in combined stack; retains dependencies. |
| [#41](https://github.com/tommy-muckstack/canvaisdead/pull/41) | `22f03b1d6faa` | Read-only public CI delta reviewed; branch also contains feature dependencies. |
| [#42](https://github.com/tommy-muckstack/canvaisdead/pull/42) | `75160a9d44bb` | All 32 storage/handoff cases pass; retains dependencies. |
| [#43](https://github.com/tommy-muckstack/canvaisdead/pull/43) | `c9e40a99b4e7` | Native downloads and accessible controls pass; retains dependencies. |
| [#44](https://github.com/tommy-muckstack/canvaisdead/pull/44) | `9a7373ead25f` | Floating-toolbar cases pass; separate page-control overlap is fixed later by #45. |
| [#45](https://github.com/tommy-muckstack/canvaisdead/pull/45) | `4bec89a9adb1` | Page controls/history/export pass; retains dependencies. |
| [#46](https://github.com/tommy-muckstack/canvaisdead/pull/46) | `010ac5a4a54f` | Text spacing and interaction cases pass; retains dependencies. |
| [#47](https://github.com/tommy-muckstack/canvaisdead/pull/47) | `816acca11fbb` | Create picker keyboard/units cases pass; retains dependencies. |
| [#49](https://github.com/tommy-muckstack/canvaisdead/pull/49) | `6620fc8655be` | Menu labels, shortcuts and lock behavior pass; retains dependencies. |
| [#50](https://github.com/tommy-muckstack/canvaisdead/pull/50) | `f2e7c0d3da03` | Presentation cases pass with later cache lifecycle fix (#51). |
| [#51](https://github.com/tommy-muckstack/canvaisdead/pull/51) | `847d62dbf296` | Saved-state reopening and recovery/conflict navigation pass; retains dependencies. |
| [#52](https://github.com/tommy-muckstack/canvaisdead/pull/52) | `50386320e757` | Mobile Projects containment/badge fix and ten library cases pass. |
| [#54](https://github.com/tommy-muckstack/canvaisdead/pull/54) | `32799cdf4664` | Drop-coordinate, original-byte, Undo/Redo and reload assertions pass; no production delta. |
| [#55](https://github.com/tommy-muckstack/canvaisdead/pull/55) | `d0e8465f7f2f` | All eleven executable Elements cases pass; no production delta. |
| [#56](https://github.com/tommy-muckstack/canvaisdead/pull/56) | `545f85cecb60` | Backup, clipboard and guest fixtures now reach and pass their assertions; combined general job remains red. |

The six unresolved P1 threads on #35/#36 still describe those individual early heads; later stack fixes are verified but have not been merged into them. #52's mobile badge thread remains resolved. Independent #48 and #53 were already merged in earlier reviews. Main is unchanged at `2784245c91faacbac463a6a0cf0b901fdab960b9`. This follow-up only records the review; existing unpublished Layers work is preserved.

[Fixture verification and retained screenshots](browser-fixture-recovery.md) · [Parity inventory](../../PARITY_REPORT.md)

## Follow-up verification of backup, clipboard and guest fixtures (#56)

[Final run 38937130228](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38937130228), code `3b4e4993785a48fda4ba7784a56957a60864a832`, passes clean install, lint, typecheck, 395 units and build. Native totals are **181 passed / 3 failed / 2 skipped** of 186: 76 focused passes, 32 storage passes and 73 general passes; twenty-four separate baseline flows pass.

All six fixture-blocked instances from #55 now reach their intended assertions. Rejected imports leave exact library bytes and card counts unchanged through reload. Native PNG paste preserves decoded dimensions/pixels, one-step Undo/Redo and exact saved artwork; plain text and the design-name field retain normal paste. Guest Home and editor sign-in preserve callbacks, expose Google/email only and retain local work through back/reload. Real Firebase authentication is not exercised in this unconfigured local runner. The final backup test waits for the baseline save acknowledgment, verified in a second changed-code run after the first completed.

Sixteen retained captures form eight pairs. Seven pairs are pixel-identical; mobile backup differs only in the seeded card below the error (50,940 pixels), with the error geometry/styles/accessibility unchanged. Every subject's measured values and snapshots agree.

**Three failures remain:** desktop crop reopening, mobile nested-group editing and mobile Layers pointer/cancellation. Source plus native failure context identifies history clearing Position while leaving Templates open over the mobile toolbar; a separate product-state fix is next. Crop/group targeting needs direct geometry evidence. No new failing scenario or skip was introduced. Early isolated heads still require later fixes; no merge or deployment occurred. Main remains `2784245c91faacbac463a6a0cf0b901fdab960b9`. [Full results and screenshots](browser-fixture-recovery.md).

## Latest review of all 19 open PRs, through #55

The owner requested review and merging of acceptable PRs. Refreshed every head, base, Git tree, secret scan and inline review thread. All 19 remote trees match the locally reviewed snapshots; #35–#52 are unchanged since their recorded reviews. Reviewed the #54/#55 test/helper/workflow deltas and their native evidence. Only #35 targets main; every other PR depends on the previous branch. Draft status is not the reason for withholding a merge.

**Decision: no additional merge.** The early heads still omit required later persistence/handoff/rendering fixes. The combined stack still leaves changed-flow assertions unverified. Six failed instances stop on identifiable fixture/locator problems, and three interaction failures need further investigation; they are not nine confirmed product regressions. Merging the test-only PRs directly into main would also bring their feature ancestors.

Latest tested code is `2fef0c479ab6238d3ad4dd3ccef39b033a0af318`, tree `824a2d847785b7b58777b013a826519fff76e055`. [Completed native run 38933635387](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38933635387) passes clean install, lint, typecheck, **395 unit tests** and build, with **175 browser passes / 9 failures / 2 skips** out of 186. Partition totals are 70 focused passes, 32 storage passes, and 73 general passes / 9 failures / 2 skips. Eighteen separate baseline capture flows pass. Later documentation-only heads do not replace this failed general-browser job.

Remaining failure evidence:
- Backup validation at both widths: `getByRole("alert")` also matches Next.js's route announcer. The assertion that the library remains unchanged is not reached.
- Clipboard paste at both widths: native Clipboard.write rejects the PNG fixture before app paste handling.
- Guest entry at both widths: the empty `data-testid="designs"` grid is hidden; the test stops before local guest save and sign-in navigation assertions.
- Desktop crop: double-clicking the first SVG image is intercepted by the page background. Visible cropped hit geometry and reopening remain unverified.
- Mobile nested group: the member-edit scenario times out. The log does not establish whether product handling or test targeting is responsible.
- Mobile Layers: the open panel's search label intercepts Position during reopening; the later Escape-cancel assertion is not reached.

#54 establishes that delivered native integer coordinates, not requested fractional ones, determine saved drop placement; both axes, native trust, original bytes, queued independent Undo/Redo and reload now pass. #55 establishes that original filter accessible names were already correct; exact role/name lookup fixes the test, with keyboard/filter/panel persistence coverage. All four final filter screenshot pairs are pixel-identical. Production drop geometry and Elements markup are unchanged by these two PRs.

| PR | Reviewed remote head | Disposition |
| --- | --- | --- |
| [#35](https://github.com/tommy-muckstack/canvaisdead/pull/35) | `7b49affd7f64` | Cannot ship alone: original-byte insertion needs later persistence, backup, guest-handoff and bounded-rendering fixes. |
| [#36](https://github.com/tommy-muckstack/canvaisdead/pull/36) | `6a99a04b5d50` | Cannot ship alone: whole-library handoff strings and native IndexedDB structured values need #39/#42. |
| [#37](https://github.com/tommy-muckstack/canvaisdead/pull/37) | `2fb321f8721d` | Upload handoff cases pass in the combined stack; inherits earlier dependencies. |
| [#38](https://github.com/tommy-muckstack/canvaisdead/pull/38) | `07695dd935a8` | Upload backup/restore cases pass; inherits earlier dependencies. |
| [#39](https://github.com/tommy-muckstack/canvaisdead/pull/39) | `a8f4aa0cbdcd` | Bounded handoff passes with later Blob storage; this head alone omits that fix. |
| [#40](https://github.com/tommy-muckstack/canvaisdead/pull/40) | `9df89bc4ad02` | Large artwork rendering/reopen/export passes in the combined stack; inherits dependencies. |
| [#41](https://github.com/tommy-muckstack/canvaisdead/pull/41) | `22f03b1d6faa` | Public-only read-only verification workflow reviewed; inherits feature dependencies. |
| [#42](https://github.com/tommy-muckstack/canvaisdead/pull/42) | `75160a9d44bb` | All 32 storage/handoff cases pass; inherits dependencies. |
| [#43](https://github.com/tommy-muckstack/canvaisdead/pull/43) | `c9e40a99b4e7` | Download and export controls pass focused verification; inherits dependencies. |
| [#44](https://github.com/tommy-muckstack/canvaisdead/pull/44) | `9a7373ead25f` | Toolbar positioning passes; later #45 handles page-control overlap. |
| [#45](https://github.com/tommy-muckstack/canvaisdead/pull/45) | `4bec89a9adb1` | Page controls/history/export pass; inherits dependencies. |
| [#46](https://github.com/tommy-muckstack/canvaisdead/pull/46) | `010ac5a4a54f` | Text interaction/spacing cases pass; inherits dependencies. |
| [#47](https://github.com/tommy-muckstack/canvaisdead/pull/47) | `816acca11fbb` | Create picker keyboard/units cases pass; inherits dependencies. |
| [#49](https://github.com/tommy-muckstack/canvaisdead/pull/49) | `6620fc8655be` | Context-menu names, shortcuts and locked actions pass; inherits dependencies. |
| [#50](https://github.com/tommy-muckstack/canvaisdead/pull/50) | `f2e7c0d3da03` | Presentation sessions pass with #51's later cache-lifecycle fix. |
| [#51](https://github.com/tommy-muckstack/canvaisdead/pull/51) | `847d62dbf296` | Saved-cache lifecycle and recovery/conflict navigation pass; inherits dependencies. |
| [#52](https://github.com/tommy-muckstack/canvaisdead/pull/52) | `50386320e757` | Mobile Projects overflow/badge finding is fixed and ten library cases pass; inherits dependencies. |
| [#54](https://github.com/tommy-muckstack/canvaisdead/pull/54) | `32799cdf4664` | No new blocker in test-only delta; delivered-coordinate/history/reload assertions pass. Inherits stack. |
| [#55](https://github.com/tommy-muckstack/canvaisdead/pull/55) | `2fef0c479ab6` | No new blocker in test-only delta; all eleven executable Elements cases pass. Combined general job still fails. |

The unresolved P1 threads on #35/#36 remain accurate for those individual heads even though later PRs contain tested fixes. #52's badge thread is resolved. All current head secret scans pass. Independent PRs #48 and #53 were already merged under the owner's review authorization; main remains `2784245c91faacbac463a6a0cf0b901fdab960b9`. No merge, deployment, payment, auth-provider or billing-setting change was performed by this review.

[Filter evidence](element-filter-labels.md) · [Drop evidence](canvas-drop-verification.md) · [Parity inventory](../../PARITY_REPORT.md)

## Follow-up verification of canvas drops (#54)

[Run 38930488027](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38930488027) at `046d0178b41d553867da5e719c8800f6f2931623` passes clean install, lint, typecheck, 395 units and build. Native totals are **171 passed / 11 failed / 2 skipped** of 184, with 66 focused, 32 storage and 73 general passes; sixteen separate baseline capture flows pass.

The earlier upload/Elements placement discrepancy is now explained by native observation. Chromium delivered integer client coordinates instead of the tests' fractional requests; all persisted centers project exactly to the delivered points through the observed SVG transform. Corrected assertions check both axes and preserve native/synthetic distinctions. Native desktop upload/Elements Undo/Redo/reload and both queued insertion/history steps pass, including the previously unreached mobile tail. All 19 executable Uploads cases pass; physical touch dragging remains unverified. Eight before/after test-correction PNGs and raw coordinates are retained. No product drop handler was changed. [Full evidence](canvas-drop-verification.md).

The eleven remaining cases cover backup alerts, clipboard fixtures, Elements filter labels, guest setup, desktop crop, mobile grouping and mobile Layers. No new failing scenario was introduced. Earlier isolated storage heads still require later fixes and the combined stack remains unmerged. Independent QA PR #53 was merged under the owner's separate review authorization; main is `2784245c91faacbac463a6a0cf0b901fdab960b9`. This follow-up is draft #54, based on #52, and does not merge or deploy anything.

## Follow-up verification of the Projects overflow fix

The specific #52 clipped-badge finding below is **resolved** at tested code `b4573f4708b1b40a09510a66b746cf4e9d8b4f43`. The mobile flex item now fits its scrollport, filters wrap and narrow cards shrink. Badge bounds are x=191–354 at 390px; populated Projects, empty All projects and empty Trash have no horizontal overflow. Ten library cases, both responsive-resize cases and sixteen separate baseline capture flows pass. Twelve inspected PNGs retain the comparison; all three desktop pairs are pixel-identical.

[Completed run 38926581623](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38926581623): clean install, lint, typecheck, 395 units and build pass. Native totals are **168 passed / 14 failed / 2 skipped** of 184 (66 focused, 32 storage and 70 general passes). The fourteen failed scenarios were already in the initial #52 run; the intermittent mobile Templates case passes again without an established cause. Two capture/setup problems encountered during this follow-up were corrected explicitly; no assertions were removed and no unchanged run was retried to hide failures. [Full evidence](projects-mobile-navigation.md).

The dependent stack remains unmerged because broader changed-flow verification is unresolved. Independent [#53](https://github.com/tommy-muckstack/canvaisdead/pull/53) now records native public original requests returning 403 at both widths alongside successful live-clone captures; that is an access limitation, not a parity match. The 17-PR review below describes its earlier immutable heads, including the now-fixed initial #52 finding.

## Review of all 17 open PRs, through #52

The owner again authorized merging acceptable PRs. Refreshed every head, base, Git tree, secret scan and review thread. All 17 published trees match the local reviewed snapshots. #35–#50 are unchanged since the preceding review; #51's production lifecycle change and tests and #52's CSS/tests/workflow and all eight screenshots were inspected. No textual conflicts or failed secret scans were found. Only #35 targets main; the rest form one dependency chain.

**Decision: no additional merge.** The earlier heads omit required later storage/handoff/rendering fixes. The combined stack still has unresolved browser verification and #52 introduces the visible regression below. Draft status is not the reason. PR #48 was already merged; main remains `557a2d2a025ccd96fa6c04d2df341902514730af`. No deployment or billing settings changed.

### Current findings

- **[P2] #52 clips the mobile free-access badge.** `app/globals.css:155` makes the badge row static and right-aligns it within the existing overflowing Projects flex item. At 390px, populated Projects has main x=56, width=475; the badge moves from x=202–365 to x=332–495, leaving 105px beyond the viewport. [The retained after screenshot](library-projects-mobile-after.png) visibly cuts off the text. Empty Trash fits, so only checking that state misses the problem. Document width is 390px in both cases: the new document-width assertion does not detect inner overflow. Bound the mobile content and assert visible badge/card/filter containment.
- **Uploads placement and queued history still need verification.** Desktop drop Y is 430.56 versus 432; mobile queued-drop X is 381.45695 versus 384. The mobile test stops before undo/redo. Measure actual dispatched pointer coordinates before deciding whether to fix test expectations or product geometry.
- **Mobile Position is obstructed in the Layers flow.** The native log for `layers.spec.ts:68` reports `.cv-psearch` intercepting the Position button when reopening after drag/undo. The later Escape-cancel assertion does not run. Other crop and nested-group failures remain unresolved; no attribution to a newly introduced regression is established.
- **Test/setup failures remain:** ambiguous backup alerts also match Next.js's route announcer, the clipboard PNG is rejected before paste, an empty guest grid is expected to be visible, and exact Elements Color lookups fail. Their downstream assertions are still unverified.
- **Intermittent mobile Templates failure returned** at `editor-shell.spec.ts:9`, also seen in #46/#50. It passes in #51. The unscoped Templates click before waiting for editor navigation is a plausible race, not a verified cause.
- **The stale presentation-return snapshot is now fixed by #51.** Immediate current text, continued editing, Undo and reload pass at both widths. Pending failed/conflicting edits survive navigation; the cache release is restricted to fully committed saved snapshots after the last subscriber leaves.

### Latest completed verification

Tested code `5debc7047cd553fa94ffa420344b94b31ce6948f`, tree `3ce4792b121bb6568c9d021a8060c34c554e32f9`. [Run 38921663275](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38921663275) passes clean install, lint, typecheck, **395 unit tests in 37 files**, and build.

| Native Chromium job, both required widths | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Focused library/editor/exports | 64 | 0 | 0 |
| Storage/handoff | 32 | 0 | 0 |
| General editor | 69 | 15 | 2 |
| **All 182 regression instances** | **165** | **15** | **2** |

Sixteen baseline capture flows pass separately. Four library failures from #51 resolve; the mobile Templates case returns. **Fifteen failed instances are not fifteen confirmed product defects or demonstrated regressions.** Secret-only checks on later documentation heads do not supersede this failed general-browser job.

| PR | Reviewed head | Disposition |
| --- | --- | --- |
| [#35](https://github.com/tommy-muckstack/canvaisdead/pull/35) | `7b49affd7f64` | Cannot ship alone: original-byte storage/recovery, guest handoff and rendering require later fixes. Combined upload placement/queued undo still fail. |
| [#36](https://github.com/tommy-muckstack/canvaisdead/pull/36) | `6a99a04b5d50` | Cannot ship alone: later bounded handoff and Blob-backed storage fixes are required. Combined migration/recovery/conflict tests pass. |
| [#37](https://github.com/tommy-muckstack/canvaisdead/pull/37) | `2fb321f8721d` | Five upload-handoff scenarios pass at both widths; no new isolated blocker. Retains dependencies. |
| [#38](https://github.com/tommy-muckstack/canvaisdead/pull/38) | `07695dd935a8` | Upload archive/restore/corruption/quota/cancel scenarios pass at both widths; no new isolated blocker. Retains dependencies. |
| [#39](https://github.com/tommy-muckstack/canvaisdead/pull/39) | `a8f4aa0cbdcd` | Above-string-limit transfer passes with #42; this head requires later storage fixes. |
| [#40](https://github.com/tommy-muckstack/canvaisdead/pull/40) | `9df89bc4ad02` | Original-image rendering/export and large-image reopen/edit pass in the combined stack; broader editor interactions remain unverified. |
| [#41](https://github.com/tommy-muckstack/canvaisdead/pull/41) | `22f03b1d6faa` | Pinned actions, read-only credentials and public runners reviewed; no new isolated blocker. Its branch contains the feature dependencies. |
| [#42](https://github.com/tommy-muckstack/canvaisdead/pull/42) | `75160a9d44bb` | All 32 storage/handoff instances pass; no new isolated blocker. Retains dependencies. |
| [#43](https://github.com/tommy-muckstack/canvaisdead/pull/43) | `c9e40a99b4e7` | SVG ZIP/JPG/PNG/PDF and keyboard/focus assertions pass; no new isolated blocker. |
| [#44](https://github.com/tommy-muckstack/canvaisdead/pull/44) | `9a7373ead25f` | Placement/reflow cases pass; the separate page-control issue is fixed by #45. |
| [#45](https://github.com/tommy-muckstack/canvaisdead/pull/45) | `4bec89a9adb1` | Page-control and page-history/export cases pass; no new isolated blocker. |
| [#46](https://github.com/tommy-muckstack/canvaisdead/pull/46) | `010ac5a4a54f` | Eight spacing instances pass; no new isolated blocker. |
| [#47](https://github.com/tommy-muckstack/canvaisdead/pull/47) | `816acca11fbb` | Twelve Create dialog instances pass; no new isolated blocker. |
| [#49](https://github.com/tommy-muckstack/canvaisdead/pull/49) | `6620fc8655be` | Menu/locked-layer action and accessible-name cases pass; no new isolated blocker. |
| [#50](https://github.com/tommy-muckstack/canvaisdead/pull/50) | `f2e7c0d3da03` | Six presentation cases pass. Its stale return-cache finding is fixed by #51. |
| [#51](https://github.com/tommy-muckstack/canvaisdead/pull/51) | `847d62dbf296` | Saved-cache lifecycle, immediate presentation return, continued edits/undo/reload and recovery/conflict navigation pass. Seven new unit cases reviewed; no new isolated blocker. |
| [#52](https://github.com/tommy-muckstack/canvaisdead/pull/52) | `5debc7047cd5` | Changes required: mobile Projects badge is clipped at x=332–495 in a 390px viewport despite passing navigation assertions. Eight library instances otherwise pass. |

[Projects evidence and captures](projects-mobile-navigation.md) · [Cache verification](design-cache-lifecycle.md) · [Parity inventory](../../PARITY_REPORT.md)

## Review of all 15 open PRs, through #50

The owner requested review and merging of acceptable PRs. Refreshed all 15 published heads, base branches, Git trees and checks; all trees match the locally reviewed snapshots and all head secret scans pass. #35–#47 are unchanged since the [preceding review](https://github.com/tommy-muckstack/canvaisdead/pull/47#pullrequestreview-5548757949). The new #49 menu labels and #50 presentation production/test/workflow changes were inspected. These PRs form one chain: only #35 targets main. Draft status is not the reason for withholding merge.

**Decision: no additional merge.** The early heads need later storage/capacity fixes, and the combined stack still has unresolved browser verification in changed upload/editor/library flows. The isolated auth PR [#48](https://github.com/tommy-muckstack/canvaisdead/pull/48) was already merged in the previous review; it is not one of these 15 open PRs. Main remains `557a2d2a025ccd96fa6c04d2df341902514730af`. No production deployment or billing setting was changed by this review.

### Evidence

Latest tested code: `b7cf8243beeeb71bf69f5469d440e0708cd9ec65`, tree `ea518fd233fe52bed956a60d5e0f4f5c6fe01d29`. [Completed run 38915415743](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38915415743) passes clean install, lint, typecheck, **388 unit tests in 37 files**, and production build. Chromium runs at 1440 × 900 and 390 × 844:

| Job | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Focused presentation / menus / editor / exports | 52 | 0 | 0 |
| Storage / recovery / handoff | 32 | 0 | 0 |
| General editor / library | 71 | 23 | 2 |
| **All 180 regression instances** | **155** | **23** | **2** |

Twelve separate baseline capture flows pass and are excluded from the regression total. Documentation/capture-only heads do not replace the actual code-run result. No rerun was used to hide the failures.

#49 resolves the two earlier Layers action-name failures and verifies disabled actions, shortcut descriptions, keyboard skipping/wrapping, focus restoration and the original downstream actions. #50 passes all six presentation instances: the original two now explicitly select page 2 before exercising Previous; four new instances verify live saved text updates, pause/resume, slide retention, notes visibility and independent/reconnected audience windows. Its only production change exposes the existing mobile Live edits switch. This corrects a test starting-page assumption, not presentation navigation logic.

### Remaining findings

- **Confirmed stale editor snapshot after presentation.** Both widths display another editor's saved “Visible update” during presentation, then display the old “Live slide” after Exit and selecting page 2. Reload recovers “Visible update”; saved data is intact. `lib/design/local-store.ts:35–41` skips rereading an already-loaded store, and `lib/useDesignLibrary.ts:7–24` retains it across client routes. Immediate freshness is logged as a diagnostic, not asserted as passing. The previous localStorage store also cached loaded values; this is a newly confirmed behavior gap, not proof that #50 or the migration introduced it. Refresh must preserve pending/conflicting edits and revision protection.
- **Uploads placement and queued history remain unverified.** Desktop drop Y is 430.56 instead of 432; mobile queued-drop X is 381.45695 instead of 384. The latter stops before undo/redo. Integer dispatched coordinates may explain the discrepancy, but they have not been measured; do not relax assertions or change geometry on that assumption.
- **Other unresolved interactions:** mobile nested-group editing, layer dragging and library/Trash flows, plus desktop crop and project-card keyboard behavior. These failures prevent a complete assessment of affected editor/library flows.
- **Known test/setup problems:** ambiguous alert locators also find Next.js's route announcer; the clipboard PNG fixture is rejected before paste; an empty guest grid is treated as visible; Elements exact Color lookups fail. Fix the fixture/locator contracts and run the downstream recovery/paste/guest/filter assertions before signing off.
- **One newly failing scenario relative to #49:** mobile Templates search times out at `editor-shell.spec.ts:9`. This case also failed intermittently during #46. Dashboard and editor both have a Templates button; the test clicks the unscoped name before waiting for editor navigation. A navigation/target race is plausible but unconfirmed. The other 22 failures were present in #49.

These are **23 failed instances, not 23 confirmed product defects or 23 demonstrated regressions**. No source-level blocker was found in the isolated #49/#50 production deltas. Retargeting either current branch to main would include its dependencies; merging it into its present base would not land the requested change on main.

| PR | Review disposition |
| --- | --- |
| #35 | Original uploads/reuse/download pass in the combined stack; placement and queued undo verification remain unresolved. Earlier head omits later persistence/handoff/rendering fixes. |
| #36 | Migration/conflicts/recovery pass with #42. This earlier head retains the native whole-record size limit and cannot ship independently. Retained-cache behavior also needs follow-up. |
| #37 | All five upload-handoff scenarios pass at both widths; no new isolated blocker. Actual Google/email completion is outside this coverage; retains dependencies. |
| #38 | All three upload backup/restore/corruption/quota/cancel scenarios pass at both widths; no new isolated blocker. |
| #39 | Large original-byte transfer passes with #42; this earlier head requires that later storage fix. |
| #40 | Original-image rendering, exports and large-image reopen/edit pass in the combined stack; broader interaction verification remains unresolved. |
| #41 | Pinned actions, read-only token, local demo credentials, standard public runners, no artifact/cache uploads. Workflow delta is acceptable; its branch includes earlier features. |
| #42 | All 32 storage/handoff instances pass; no new isolated blocker. Retains earlier dependencies. |
| #43 | Actual SVG ZIP/JPG/PNG/PDF and keyboard/focus assertions pass; no new isolated blocker. |
| #44 | Four placement/reflow instances pass; the separate page-control issue is fixed by #45. |
| #45 | Four new page-control instances and existing page-history/export checks pass; no new isolated blocker. |
| #46 | All eight spacing instances pass; no new isolated blocker. |
| #47 | All 12 Create instances pass, including four previously failing cases; no new isolated blocker. |
| #49 | Both Layers action cases and both canvas context-menu cases pass. Explicit accessible names/descriptions preserve visible layout; no new isolated blocker. |
| #50 | All six presentation cases pass and mobile Live edits is visible. Stale return-cache diagnostic is explicitly unresolved; retains the failing combined stack. |

[Menu evidence](context-menu-labels.md) · [Presentation evidence and ten captures](presentation-live-controls.md) · [Parity inventory](../../PARITY_REPORT.md)

## Prior review of all 12 open PRs

The owner again requested review and merging of acceptable PRs. All 12 published heads match their locally reviewed trees, pass GitGuardian, and have no textual merge conflict. They form one chain, from #35 targeting main through #46 targeting #45. Draft status is not the reason for withholding merge: earlier heads omit required later capacity/handoff fixes, while the combined stack still has unresolved native browser failures.

The latest code commit is `210ff1466ef20e7f0df2086b002906814d2c12a0`, tree `3770b1e74d551887e03aa0c2ed87d3a7e2d524c5`. Completed [run 38905996524](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38905996524) passes clean install, lint, typecheck, **388 unit tests in 37 files**, and production build. Native Chromium runs at 1440 × 900 and 390 × 844:

| Job | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Storage / recovery / handoff, 116989592315 | 32 | 0 | 0 |
| Selection / downloads / spacing, 116989592591 | 30 | 0 | 0 |
| Editor / library, 116989591963 | 80 | 30 | 2 |
| **All 174 regression instances** | **142** | **30** | **2** |

The six separate baseline capture flows pass and are excluded from the regression total. This evidence commit changes documentation/captures only; its secret scan must not be mistaken for a passing full browser suite.

The previously reported formatting-bar obstruction of Add page and Done selecting is resolved by #45. Its observer cleanup, measured row/canvas spacing, scroll handling, grid placement and normal pointer interactions were reviewed; its four cases and both unchanged page-history/export cases pass. #46 fixes spacing-panel stacking with one conditional CSS rule. Its normal canvas clicks also resolve incorrect test targeting between SVG text lines, without changing editing logic or weakening anchor/undo/export assertions. All eight spacing instances pass. The current 30 failed scenarios all appeared in #45's run; no newly failing scenario was identified in #46. See the [page-control evidence](page-controls.md) and [spacing evidence](multiline-text-interactions.md).

Remaining findings preventing full-stack sign-off:

- **Create keyboard dismissal remains unresolved at both widths.** After a search and Escape, the dialog remains mounted (`create-design.spec.ts:27`). Whether the search control consumes Escape must be measured before choosing the fix. Custom-size cases also stop at the exact Units label; their conversion/persistence tail is unverified.
- **Layers and related interactions remain unverified.** Both widths fail to find the expected disabled Delete action after opening a locked layer's menu (`layers.spec.ts:39`). Mobile layer dragging and nested-group editing time out; presentation flows time out at both widths. These need focused event/target evidence, not forced clicks or longer deadlines.
- **Uploads placement and queued-drop history remain unresolved.** Desktop drag records Y 430.56 versus 432; mobile queued-drop records X 381.45695 versus 384. Integer pointer coordinates may explain the discrepancies. Measure the dispatched event before changing product geometry or expectations. The mobile case stops before its undo/redo assertions.
- **Established test problems still block important downstream assertions.** Broad alert locators match Next.js's route announcer plus the intended error; the clipboard PNG is rejected before pasting; fresh guest setup treats an empty grid as visible; exact nested labels for Units and Elements Color do not resolve. Other mobile Trash/library and desktop crop timeouts still need triage.

These are **30 failed test instances, not 30 confirmed product defects or proven regressions introduced by this stack**. The prior investigation run also had an intermittent mobile Templates-opening timeout on unchanged application code; that case passes in the final run, but its intermittent cause is not established.

| PR | Review disposition |
| --- | --- |
| [#35](https://github.com/tommy-muckstack/canvaisdead/pull/35) | Original reuse/download, metadata/Trash, retry and edited export pass in the combined stack. This head omits later persistence/handoff/rendering fixes. Drag and queued-drop assertions above remain unresolved. |
| [#36](https://github.com/tommy-muckstack/canvaisdead/pull/36) | Migration, conflicts and large-original recovery pass with #42. This head retains the obsolete whole-library record limit and cannot ship independently. |
| [#37](https://github.com/tommy-muckstack/canvaisdead/pull/37) | Five native upload-handoff scenarios pass at both widths. Real Google/email completion remains outside that coverage. No new isolated blocker; depends on the stack. |
| [#38](https://github.com/tommy-muckstack/canvaisdead/pull/38) | Three native archive/restore/corruption/quota/cancel scenarios pass at both widths. No new isolated blocker; depends on the stack. |
| [#39](https://github.com/tommy-muckstack/canvaisdead/pull/39) | Original-byte and above-limit transfer pass with #42. This head requires the later storage fix. |
| [#40](https://github.com/tommy-muckstack/canvaisdead/pull/40) | Native original-image rendering, ordinary export and large-image reopen/edit pass in the combined stack. Broader editor interaction failures remain unresolved. |
| [#41](https://github.com/tommy-muckstack/canvaisdead/pull/41) | Pinned actions, read-only token, local demo server, public runners and no artifact/cache uploads. Safe workflow delta; its current branch also contains the earlier feature stack. |
| [#42](https://github.com/tommy-muckstack/canvaisdead/pull/42) | All 32 native storage/handoff checks pass again. No new isolated blocker; depends on earlier PRs. |
| [#43](https://github.com/tommy-muckstack/canvaisdead/pull/43) | Actual SVG ZIP/JPG/PNG/PDF and keyboard/focus assertions pass at both widths. No new isolated blocker; depends on earlier PRs. |
| [#44](https://github.com/tommy-muckstack/canvaisdead/pull/44) | Four placement/reflow cases pass and captures confirm the toolbar clears artwork. The separate page-control issue has a verified fix in #45. |
| [#45](https://github.com/tommy-muckstack/canvaisdead/pull/45) | Four new native cases and unchanged page-history/export checks pass; captures show enabled page actions clear of the formatting bar. No new isolated blocker found. |
| [#46](https://github.com/tommy-muckstack/canvaisdead/pull/46) | Eight spacing instances pass; conditional stacking and before/after captures reviewed. No new isolated blocker found; combined editor/library job remains red. |

**Decision: no merge.** None of these PRs can be merged independently into main as currently based while retaining the required later fixes and excluding the unresolved stack. Keep the 12 drafts open pending targeted triage and verification. Main remains `93b7fe9685fa13e3262ea0fdedb823fbf1e61a60`; no deployment or billing settings changed.

## Prior review of all nine then-open PRs

All nine PRs remain open drafts in one dependency chain, from #35 targeting main through #43 targeting #42. Their published trees match the locally reviewed snapshots. Secret scans pass on all nine heads. The newest code tree is `2250aea8c317109726e89b1b22a81841efaa2f13`, remote commit `395535d7f589095e205d1245be595803d1115e26`. A subsequent documentation/capture-only commit records these results without changing the tested application, tests or workflow.

Completed [run 38896077575](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38896077575): clean install, lint, typecheck, **384 unit tests** and production build pass. Native Chromium at 1440px and 390px reports:

| Job | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Storage / recovery / handoff, 116956744130 | 32 | 0 | 0 |
| Downloads / exported artwork, 116956743891 | 11 | 5 | 0 |
| Editor / library, 116956744198 | 78 | 38 | 2 |
| **All 166 regression instances** | **121** | **43** | **2** |

The two separate before-capture flows also pass; they do not add regression coverage to that total. Actual clone before/after PNGs, computed styles and accessibility snapshots are retained in [the download evidence](download-accessibility.md). Their pixel identity verifies that explicit labels did not change the measured Download layout. Original/clone visual parity remains unverified.

The large-record blocker is fixed in #42 and verified again. The Download lookup and unnamed Size slider are fixed in #43; native selected-page SVG ZIP, JPG size/quality, transparent PNG, PDF Standard, cropped/flipped artwork and uploaded-original export now pass at both widths. No new source-level blocker was found in either fix. These successes do not establish readiness of every earlier head in isolation: those heads omit their later fixes.

Remaining failures require focused triage before merging this combined stack. Mobile text double-click is intercepted by `.cv-float`; page-editing and text-spacing scenarios stop before opening Download. Recovery/library assertions, Create dismissal and Units labels, Elements filters, locks/selection/layers and presentation flows are also red. The Uploads drag checks report position differences (desktop Y 430.56 vs 432; mobile X 381.457 vs 384), with the mobile case stopping before its undo assertions. Integer pointer coordinates may explain those small differences; measure actual dispatched coordinates before changing the product or tolerance. Broad alert selectors and the rejected clipboard PNG fixture are established test problems. **These are 43 failed instances, not 43 confirmed product defects or 43 proven regressions introduced by this stack.**

| PR | Latest review disposition |
| --- | --- |
| [#35](https://github.com/tommy-muckstack/canvaisdead/pull/35) | Original uploads, reuse, metadata, Trash, retry and edited export have passing native coverage in the combined stack. Placement/queued-drop assertions remain unresolved. Cannot ship alone without the later persistence, handoff and rendering fixes. |
| [#36](https://github.com/tommy-muckstack/canvaisdead/pull/36) | Migration, conflicts, originals and recovery pass with #42. This head still contains the old whole-library record and must not ship without #42. |
| [#37](https://github.com/tommy-muckstack/canvaisdead/pull/37) | All five native upload-handoff scenarios pass at both widths. Retain with the dependency stack; real Google/email completion is not established by repository tests. |
| [#38](https://github.com/tommy-muckstack/canvaisdead/pull/38) | All three native uploads-backup scenarios now pass at both widths, including originals/Trash restoration, corruption/quota retry and cancellation. Depends on the unresolved stack. |
| [#39](https://github.com/tommy-muckstack/canvaisdead/pull/39) | Native handoff cases and above-limit originals transfer pass with #42. Depends on the later record-format fix and earlier features. |
| [#40](https://github.com/tommy-muckstack/canvaisdead/pull/40) | Normal artwork across editor/pages/Layers/Projects/Present and SVG export passes with #43; eight-original save/read/edit/reload/Projects passes with #42. Broader pointer/text flows remain unresolved. |
| [#41](https://github.com/tommy-muckstack/canvaisdead/pull/41) | Workflow uses pinned actions, read-only credentials, free public runners and no uploaded artifact/cache storage. It exposes the red browser checks. Its branch includes the earlier features, so it is not independently mergeable into main as written. |
| [#42](https://github.com/tommy-muckstack/canvaisdead/pull/42) | Storage-size fix passes all 32 storage/handoff cases; no additional blocker found in the delta. Keep with the unresolved stack. |
| [#43](https://github.com/tommy-muckstack/canvaisdead/pull/43) | Explicit labels and actual export assertions pass; before/after layout is unchanged. Whole-stack CI remains red (121/43/2); keep draft/unmerged. |

No PR merged, no production or billing settings changed. Main remains `93b7fe9685fa13e3262ea0fdedb823fbf1e61a60`. The findings below are historical evidence from earlier heads, not the latest result.

## Follow-up review including #42

All eight open PRs form one chain from #35 to #42. GitHub reports each mergeable with no textual conflict, and all secret scans pass. The CI PR is safe as an isolated workflow change, but its current head includes the feature stack. It cannot be merged independently into main as written.

The native size-limit defect below is **fixed and verified by #42 for the tested capacity**. [Run 38892649896](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38892649896), storage job 116946102008, passes all **32 tests** at 1440px and 390px. The exact eight-original-image design now saves, reads back with identical sources, decodes, reopens, renames/saves/reopens again, and appears in Projects. Native backup/restore and guest transfer above the record limit also pass, along with migration, concurrent revisions, aborted commits and raw recovery. [Full results and timings](blob-design-storage.md).

Tested follow-up commit: `62cb61cf2a9bb50b2194167e456114d4b7e511ba`, tree `0d88b084c679532415e672482275d0f74ff5da50`. Clean install, lint, typecheck, 384 unit tests and production build pass. Its complementary 134-case editor/library job (116946102238) completed with **77 passed, 55 failed and 2 skipped** in 12 minutes. Combined with storage, the run has **109 passed, 55 failed and 2 skipped** out of 166. Do not treat the failed assertions as all confirmed product bugs; selector/fixture and interaction failures still require triage. The preceding cancelled run was superseded by this completed result.

Remaining merge blockers are unresolved editor/library verification, including export controls, keyboard/pointer interactions and upload placement assertions. Some are selector/fixture problems; others need behavioral investigation. No original/clone paired captures have been retained. No PR was merged, and main remains `93b7fe9685fa13e3262ea0fdedb823fbf1e61a60`.

The initial findings and table below describe the pre-#42 heads. #42 resolves their shared record-size blocker in the combined stack; it does not retroactively make those individual earlier heads safe to deploy without the fix.

Tested code: [`1ea7d419d248f280f588a12f2ae8e9e9f8f294c1`](https://github.com/tommy-muckstack/canvaisdead/commit/1ea7d419d248f280f588a12f2ae8e9e9f8f294c1), tree `9f691900ffac3ee767e23578bb19b90ab33d0ab3`. This is #35–#40 plus the test-only workflow in #41. Main remains `93b7fe9685fa13e3262ea0fdedb823fbf1e61a60`.

## Reproducible results

[GitHub Actions run 38886711538](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38886711538), job 116926116969, used a standard Ubuntu 24.04 runner, Node 24.12.0 and Chrome Headless Shell 156.0.8078.4 (Playwright Chromium v1248). No production credentials or design/media uploads were used. The app ran on the runner's loopback address with demo/guest authentication.

- Clean `npm ci`, lint, typecheck, **379 unit tests in 35 files**, and production build passed. Unlike the earlier local checks, this installation did not use the dependency overlay.
- Chromium executed the desktop (1440 × 900) and mobile (390 × 844) projects: **90 passed, 62 failed, 2 skipped, 4 did not run**. The 20-minute suite deadline produced two additional suite/teardown errors. This is not a green run.
- All three design-handoff and five upload-handoff scenarios passed at both widths, including transaction rollback, revisions, retry receipts, legacy copy IDs and preserving account edits/deletion. This does not verify real Google/email sign-in or large-library capacity.
- The normal-size artwork case reached its editor/page/Layer image assertions, then failed at the Download file-type locator. The large case failed before rendering, during native persistence.
- Some clone screenshots were generated by reached test steps, but artifacts were deliberately not uploaded; those ephemeral files are not available for inspection. No original/clone paired capture or visual parity claim is made.

## P1: accepted original-image designs exceed the native record limit

[Design repository, line 64](../../../lib/design/repository.ts#L64) writes the entire account library into one structured IndexedDB value. The existing capacity regression creates eight instances of a valid 4096 × 4096 PNG (50,343,487 original bytes, inside the Uploads limit). Both viewport projects fail on the production repository's write:

```text
UnknownError: The serialized keys and/or value are too large
(size=537002514 bytes, max=133169152 bytes).
```

This is a native Chromium storage failure, not a test-double quota simulation or an SVG-string error. The current record layout cannot persist this accepted artwork. #40 removes aggregate SVG strings but cannot make the failed record save. Large guest transfers also write through this repository. The current save-error UI preserves pending edits; that protection does not make the advertised original-image capacity work.

The earlier source inspection of Chromium's large-value Blob wrapping did not establish behavior for the tested backend. The runtime result takes precedence. Fix storage using a bounded representation or out-of-line media/Blobs, preserving atomic revision checks, migration, original bytes and recovery. Then rerun actual save/reload, edit, backup/restore and guest transfer above this observed limit. Do not mark capacity verified from repository doubles or Node structured clones.

## Other failures require triage

The 62 failed instances are **not 62 confirmed product defects**:

- Broad `getByRole("alert")` selectors also find Next.js's route announcer. The intended application error is present in those strict-selector failures.
- Fresh guest tests expect an empty `.cd-grid` to be visible, but its zero-size element is considered hidden. Those migration/conflict scenarios stop in setup and do not test the claimed storage behavior.
- Exact nested-label selectors such as Download's `File type`, size units and Elements filters time out. Correct the accessible label/locator contract and verify the real controls before diagnosing missing export behavior.
- The tiny clipboard PNG fixture is rejected by Chromium's clipboard decoder. Replace it with a complete valid generated image and rerun the paste flow.
- Escape dismissal, Trash state, menu targeting, drag coordinates and several pointer/touch flows fail assertions or time out. These need focused interaction evidence; preserve the assertions' intended behavior instead of merely increasing timeouts.

The following inventory lists every unique test location with a failed instance. Four mobile cases did not run; the final summary and full diagnostics are in the linked job log.

| Test | Failed viewport(s) | Scenario |
| --- | --- | --- |
| [artwork-rendering.spec.ts:31](../../../tests/e2e/artwork-rendering.spec.ts#L31) | desktop, mobile | independent SVG images retain crops, flips and original sources across editor, pages, Layers, Projects and Present |
| [artwork-rendering.spec.ts:54](../../../tests/e2e/artwork-rendering.spec.ts#L54) | desktop, mobile | a page above the single-string ceiling remains editable after native save/reload and leaves library backup reachable |
| [backup.spec.ts:36](../../../tests/e2e/backup.spec.ts#L36) | desktop, mobile | invalid backup import leaves the project library unchanged |
| [clipboard.spec.ts:88](../../../tests/e2e/clipboard.spec.ts#L88) | desktop, mobile | plain text and raster images paste locally while native text fields keep normal paste |
| [create-design.spec.ts:10](../../../tests/e2e/create-design.spec.ts#L10) | desktop, mobile | Create opens a searchable picker from Projects and returns keyboard focus on dismissal |
| [create-design.spec.ts:35](../../../tests/e2e/create-design.spec.ts#L35) | desktop, mobile | Custom size validates, converts units, locks proportions and persists the requested canvas |
| [design-storage.spec.ts:15](../../../tests/e2e/design-storage.spec.ts#L15) | desktop, mobile | legacy designs migrate on a successful save while the original localStorage bytes remain intact |
| [design-storage.spec.ts:38](../../../tests/e2e/design-storage.spec.ts#L38) | desktop, mobile | two editors retain conflicting versions instead of silently overwriting saved artwork |
| [design-storage.spec.ts:52](../../../tests/e2e/design-storage.spec.ts#L52) | desktop, mobile | a real PNG above the old string quota survives insertion, reload, presentation and backup import |
| [download.spec.ts:5](../../../tests/e2e/download.spec.ts#L5) | desktop, mobile | downloads custom pages as a ZIP, a sized transparent PNG, and a multi-page PDF locally |
| [elements.spec.ts:54](../../../tests/e2e/elements.spec.ts#L54) | desktop, mobile | filters compose with search and keyboard navigation does not move selected artwork |
| [elements.spec.ts:62](../../../tests/e2e/elements.spec.ts#L62) | desktop | dragging a catalog item onto the canvas uses the actual drop coordinates |
| [guest-session.spec.ts:3](../../../tests/e2e/guest-session.spec.ts#L3) | desktop, mobile | guest entry saves locally and exposes Google/email sign-in from home and editor |
| [image-crop.spec.ts:37](../../../tests/e2e/image-crop.spec.ts#L37) | desktop | crop preview preserves source pixels, commits once, and reopens with undo and redo |
| [image-crop.spec.ts:97](../../../tests/e2e/image-crop.spec.ts#L97) | desktop, mobile | SVG and PNG exports show the repositioned crop instead of the full original |
| [image-flip.spec.ts:70](../../../tests/e2e/image-flip.spec.ts#L70) | desktop, mobile | rotated cropped flips agree in SVG and PNG pixels for each axis combination |
| [layers.spec.ts:32](../../../tests/e2e/layers.spec.ts#L32) | desktop, mobile | layer previews, overlapping filter, background editing and actions remain usable |
| [library.spec.ts:12](../../../tests/e2e/library.spec.ts#L12) | desktop, mobile | rename, copy, trash, restore and confirmed permanent deletion persist locally |
| [library.spec.ts:61](../../../tests/e2e/library.spec.ts#L61) | desktop, mobile | card controls support keyboard dismissal, validation and project search |
| [local-save.spec.ts:17](../../../tests/e2e/local-save.spec.ts#L17) | desktop, mobile | storage failure is visible, backup is local, and retry persists the latest edit |
| [local-save.spec.ts:47](../../../tests/e2e/local-save.spec.ts#L47) | desktop, mobile | corrupt saved data is preserved and a failed read can be retried |
| [pages.spec.ts:5](../../../tests/e2e/pages.spec.ts#L5) | desktop, mobile | page edits survive switching, duplication, reorder, undo, reload and selected-page export |
| [presentation.spec.ts:4](../../../tests/e2e/presentation.spec.ts#L4) | desktop, mobile | presentation navigates pages, autoplays, and keeps notes in presenter view |
| [text-layout.spec.ts:5](../../../tests/e2e/text-layout.spec.ts#L5) | desktop, mobile | edited spaces and long words survive reload and SVG export |
| [text-spacing.spec.ts:60](../../../tests/e2e/text-spacing.spec.ts#L60) | desktop, mobile | end anchoring holds text in place as typing adds lines and export retains spacing |
| [text-spacing.spec.ts:77](../../../tests/e2e/text-spacing.spec.ts#L77) | desktop, mobile | outside click commits a spacing preview before moving text and locks hide the controls |
| [uploads.spec.ts:68](../../../tests/e2e/uploads.spec.ts#L68) | desktop | native thumbnail drag inserts at the canvas drop point |
| [uploads.spec.ts:93](../../../tests/e2e/uploads.spec.ts#L93) | desktop | an uploaded original remains editable through crop, flip, reload and SVG export |
| [clipboard.spec.ts:68](../../../tests/e2e/clipboard.spec.ts#L68) | mobile | failed and delayed menu cuts preserve originals while a native cut is undoable |
| [groups.spec.ts:66](../../../tests/e2e/groups.spec.ts#L66) | mobile | nested groups allow member edits, parent selection and removal without losing the rest |
| [groups.spec.ts:96](../../../tests/e2e/groups.spec.ts#L96) | mobile | a group containing a locked member cannot be partially moved or deleted |
| [layers.spec.ts:50](../../../tests/e2e/layers.spec.ts#L50) | mobile | pointer dragging shows an insertion marker, commits once, and Escape cancels |
| [library.spec.ts:78](../../../tests/e2e/library.spec.ts#L78) | mobile | expired Trash is removed on reopening the library while active designs remain |
| [locking.spec.ts:4](../../../tests/e2e/locking.spec.ts#L4) | mobile | a saved lock prevents edits and can be unlocked after reload |
| [position.spec.ts:87](../../../tests/e2e/position.spec.ts#L87) | mobile | locked elements are read-only, text height follows content, and Layers stays reachable without a selection |
| [selection.spec.ts:48](../../../tests/e2e/selection.spec.ts#L48) | mobile | shift selection, keyboard bulk edits, undo and reload preserve content and locks |
| [selection.spec.ts:98](../../../tests/e2e/selection.spec.ts#L98) | mobile | selection mode supports tapping and bulk lock protection without a keyboard |
| [uploads.spec.ts:75](../../../tests/e2e/uploads.spec.ts#L75) | mobile | accepted drops queue behind a slow original read and each keeps its own undo step |

## PR disposition

| PR | Area | Review result |
| --- | --- | --- |
| [#35](https://github.com/tommy-muckstack/canvaisdead/pull/35) | Original Uploads library | Blocked: accepted originals can produce a design that cannot save. |
| [#36](https://github.com/tommy-muckstack/canvaisdead/pull/36) | IndexedDB designs and backups | Blocked: whole-library record fails the native size limit; migration/conflict UI tests stop in setup. |
| [#37](https://github.com/tommy-muckstack/canvaisdead/pull/37) | Guest uploads | Native repository/handoff cases pass; keep with the blocked dependency stack. |
| [#38](https://github.com/tommy-muckstack/canvaisdead/pull/38) | Uploads backups | Desktop backup scenarios pass; mobile tail was not executed before the deadline. Depends on the blocked stack. |
| [#39](https://github.com/tommy-muckstack/canvaisdead/pull/39) | Large guest designs | Moderate-size native handoff cases pass; large writes still use the failing repository. |
| [#40](https://github.com/tommy-muckstack/canvaisdead/pull/40) | Artwork rendering and SVG ZIPs | Node geometry/large-output checks pass. Native capacity fails during save and normal export flow stops at a locator. |
| [#41](https://github.com/tommy-muckstack/canvaisdead/pull/41) | Public Linux CI | Clean install/code checks run successfully and expose the failures above. Test-only change; kept draft with its dependency stack. |

All six original PR heads remained unchanged during this review. Their GitGuardian checks pass. No PR was merged and no production or billing setting changed. Standard public-repository runners are free; this workflow skips private repositories and uploads no cache or artifact storage. See [GitHub billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions).
