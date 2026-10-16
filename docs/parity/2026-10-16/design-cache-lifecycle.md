# Fresh saved artwork after client navigation

Date: 2026-10-16. Parent: #50, `f2e7c0d3da0379ba52c6b40c2390a548d0d47d5a`. Status: **differs**; native verification and paired captures pending.

## Observed behavior and change

The parent run reproduces a stale editor at both 1440 × 900 and 390 × 844. Another editor saves “Visible update”; presentation displays that text. After Exit and selecting page 2, the editor displays the cached “Live slide”. Reload reads the correct saved text. Saved bytes are intact. [Parent evidence](presentation-live-controls.md#newly-confirmed-return-cache-gap).

The owner-scoped store outlives its subscribers. Its load method intentionally preserves existing editing/recovery state, but that also keeps an obsolete saved library after all editors close. The new lifecycle releases only fully committed saved snapshots after the last subscriber leaves. The next consumer sees loading and rereads local storage before initializing editor history. It does not adopt another tab's library over an active editor.

Pending saves finish normally. If a consumer remounts before the write completes, it retains the pending work. Failed saves and conflicts remain available for editing, backups and recovery across navigation. Initial reads that finish after their consumer leaves cannot leave a stale saved cache behind. Old background checks cannot mark a newly read revision as conflicting. No forced page reload, hard navigation, changed revision protection or new storage/network service.

## Verification scope

Seven new unit cases cover final-subscriber release/current revision, an in-flight save finishing after navigation, remount during a save, quota-failed writes and retry, conflicts and preserved saved copies, abandoned initial reads, and obsolete background checks. Existing store/repository/handoff tests remain.

The native live-presentation case now asserts current text immediately on return, edits it, undoes back to the current saved text, saves and reloads. The old immediate-return diagnostic is replaced by an actual assertion. A separate parent capture reproduces the older text with unchanged parent storage code.

Native failed-save and conflict cases now navigate Home and reopen the design before backing up/retrying; they must retain the pending version and preserve the saved copy. The existing read-error recovery case remains. Its and the failed-save case's alert locators now identify the intended save notice rather than also matching Next.js's route announcer. No recovery assertions were removed, and no deadlines or forced clicks were added.

The production change is limited to `lib/design/local-store.ts`. Native jobs and capture code do not use production credentials or design files. Paired screenshots and final clean-install/browser results will be recorded here after the run. Existing parity gaps, including return-page selection, original appearance and remote collaboration, remain open.
