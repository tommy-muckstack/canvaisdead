# Native browser review of PRs #35–#43

Date: 2026-10-16. Decision: **leave the dependent stack unmerged**. The owner authorized merging acceptable PRs; this is a verification decision, not a request for more permission.

## Latest review of all nine open PRs

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
