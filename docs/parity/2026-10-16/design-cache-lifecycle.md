# Fresh saved artwork after client navigation

Date: 2026-10-16. PR: [#51](https://github.com/tommy-muckstack/canvaisdead/pull/51). Parent: #50, `f2e7c0d3da0379ba52c6b40c2390a548d0d47d5a`. Status: **differs** overall; the observed return-cache gap is fixed and verified at both widths.

## Observed behavior and change

The parent run reproduces a stale editor at both 1440 × 900 and 390 × 844. Another editor saves “Visible update”; presentation displays that text. After Exit and selecting page 2, the editor displays the cached “Live slide”. Reload reads the correct saved text. Saved bytes are intact. [Parent evidence](presentation-live-controls.md#newly-confirmed-return-cache-gap).

The owner-scoped store outlives its subscribers. Its load method preserves editing/recovery state, but that also kept an obsolete saved library after all editors closed. The new lifecycle releases only fully committed saved snapshots after the last subscriber leaves. The next consumer sees loading and rereads local storage before initializing editor history. It does not adopt another tab's library over an active editor.

Pending saves finish normally. If a consumer remounts before the write completes, it retains the pending work. Failed saves and conflicts remain available for editing, backups and recovery across navigation. Initial reads that finish after their consumer leaves cannot leave a stale saved cache behind. Old background checks cannot mark a newly read revision as conflicting. No forced page reload, hard navigation, changed revision protection or new storage/network service.

## Completed verification

Tested code: `4b21c0249269e62c1279c306f92f0a97522b9001`, tree `47fd799905c61b59041d333408c29d1f35e38bac`. [Completed run 38919303552](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38919303552) passes clean install on Node 24.12, lint, typecheck, **395 unit tests in 37 files**, and production build. Local checks also pass with the documented dependency overlay.

| Native Chromium job | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Focused presentation / recovery / editor / exports, 117034775823 | 56 | 0 | 0 |
| Storage / recovery / handoff, 117034775613 | 32 | 0 | 0 |
| General editor / library, 117034775756 | 72 | 18 | 2 |
| **All 180 regression instances** | **160** | **18** | **2** |

Fourteen separate parent capture flows pass and are excluded from the regression total. The regression partition has no overlap or omissions. All jobs are terminal; no rerun replaced the result. The final evidence commit changes documentation/captures only.

Seven new unit cases cover final-subscriber release/current revision, an in-flight save finishing after navigation, remount during a save, quota-failed writes and retry, conflicts and preserved saved copies, abandoned initial reads, and obsolete background checks. Existing store/repository/handoff tests remain.

The native live-presentation case now asserts current text immediately on return, edits it, undoes back to the current saved text, saves and reloads. Both viewports pass. The old immediate-return diagnostic is replaced by an actual assertion; freshness does not depend on the later reload. All six presentation instances pass.

Native failed-save and conflict cases navigate Home and reopen the design before backing up/retrying. Both widths retain the pending version and preserve the saved copy. All four failed-save/read-error instances and both conflict instances pass. The alert locators identify the actual save notice rather than also matching Next.js's route announcer. This resolves four prior test failures without removing recovery assertions, increasing deadlines or forcing clicks; it does not claim four newly fixed production save defects.

The mobile Templates case also passes in this run. Its earlier intermittent failure remains unexplained; this result does not establish that the cache change fixed it. All 18 remaining failed instances were present in #50. No newly failing scenario was identified.

## Paired native evidence

All four original PNGs were retained from job 117034775823 and visually inspected. They contain generated test artwork only. Both parent and changed captures exit a presentation after another editor saves “Visible update”, then select page 2 without reloading.

| Viewport | Parent: stale “Live slide” | Changed: current “Visible update” |
| --- | --- | --- |
| 1440 × 900 | [Before](design-cache-desktop-before.png) | [After](design-cache-desktop-after.png) |
| 390 × 844 | [Before](design-cache-mobile-before.png) | [After](design-cache-mobile-after.png) |

[Native text, canvas bounds, computed font/color, save indicator, pixel comparison and provenance](design-cache-controls.json).

Canvas bounds remain x416/y177.75/1000 × 562.5 on desktop and x76/y404.0625/302 × 169.875 on mobile. Computed artwork font/color agree; the saved indicator is visible in both versions. Pixel differences are confined to the main headline and its page thumbnail: 7,786 desktop pixels and 1,063 mobile pixels. The rest of each captured editor layout is identical. These compare clone before/after states, not original/clone visual parity.

## Remaining work

The production change is limited to `lib/design/local-store.ts`. No production credentials or private design/media files enter CI. Storage location and on-disk format, revision checks, backup formats, authentication, analytics, dependencies and billing are unchanged.

Page selection still resets when reopening the editor. Remote/cross-device collaboration, broader original appearance and the other presentation gaps remain unfinished. The full suite still has 18 failed instances, including unresolved upload coordinates, group/layer/crop/library interactions and fixture/selector problems. Present mode and Autosave stay **differs** in the parity inventory; this PR is not a full parity or merge-readiness claim. It remains a draft stacked on #50, unmerged.
