# Recover browser coverage for backup, clipboard and guest entry

Date: 2026-10-16. PR [#56](https://github.com/tommy-muckstack/canvaisdead/pull/56), based on #55. Production behavior is unchanged; no original/clone parity match is claimed.

## Evidence and change

[Parent run 38933635387](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38933635387) has six failures before the intended application assertions can finish:

- The invalid-backup test's global alert locator also matches the Next.js route announcer. Scope it to Local design files. Wait for the real save acknowledgment before the baseline snapshot; retain the card-count check and compare the exact persisted library before rejection, afterward and after reload.
- Native Clipboard.write rejects the existing PNG bytes before paste. Generate a complete patterned PNG with the browser encoder and validate its dimensions before writing it to the system clipboard. The seeded one-pixel image also uses the existing complete PNG fixture encoder.
- A new guest's empty grid has no rendered height. Assert the visible Your designs heading and empty-state copy, attached grid and zero cards instead of requiring the empty grid itself to have an area.

The original plain-text and design-name-field paste checks remain. Native raster paste produces an image with saved dimensions 32 × 24; decoded left/right samples are exactly RGBA [255,87,87,255] and [0,196,204,255]. One-step Undo/Redo, exact artwork through reload, and the saved design name pass at both widths.

Guest coverage visits sign-in from both Home and the editor, checks callback destinations and Google/email-only choices, and verifies local design bytes through back navigation and reload. No real provider sign-in is attempted. The isolated server has no Firebase configuration; its Google button is disabled. Demo access exists only for these local test sessions and is not counted as a production provider.

## Completed verification

[Final run 38937130228](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38937130228) tests code `3b4e4993785a48fda4ba7784a56957a60864a832`, tree `1b5233b32cc55b935d958cce6f31ccddec8576bc`. Clean install, lint, typecheck, **395 unit tests in 37 files**, and production build pass. Native Chromium runs at 1440 × 900 and 390 × 844:

| Partition | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Focused backup/clipboard/guest/library/editor/exports | 76 | 0 | 0 |
| Storage/handoff | 32 | 0 | 0 |
| General editor | 73 | 3 | 2 |
| **186 regression instances, no overlap** | **181** | **3** | **2** |

All four backup, eight clipboard and two guest-entry instances pass, including all six previously blocked cases and their extended assertions. Twenty-four separate baseline flows pass: eighteen existing captures plus these three repaired scenarios at both widths. No cases were removed or newly skipped; the two existing skips concern desktop mouse dragging on mobile and do not verify physical touch dragging.

[Initial run 38936230684](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38936230684), code `d714d8e49742b0f033f064051255d32a1024bd95`, also finished 181/3/2 with all code checks and 24 baseline flows passing. Final review added the explicit saved-baseline wait to avoid comparing against a pending demo seed. The final code was then verified separately; no unchanged rerun or cancellation was used.

## Retained comparison

The production parent is rebuilt separately, and the repaired tests reach its real UI with the same valid fixtures. Before/after therefore means parent/current production builds reached through valid fixtures, not a claimed visual change. Sixteen PNGs retain eight pairs. Seven pairs are byte- and pixel-identical; the final mobile backup pair has **50,940 changed pixels at x=81–356, y=532–807**, showing a different first seeded card below the error (Sunset quote versus Pitch title slide). The error component itself is unchanged. The demo library is sorted by update time; ordering between separately created fixture libraries is not a product change.

Every pair has identical subject geometry, computed styles, accessibility snapshots and checked details. Eight initial unique images and the changed final mobile image were visually inspected; final file bytes were compared with those inspected copies. Images were not normalized or altered to hide the card difference.

| State | Desktop before / after | Mobile before / after |
| --- | --- | --- |
| Rejected backup; originals retained | [Before](fixture-backup-rejected-desktop-before.png) / [After](fixture-backup-rejected-desktop-after.png) | [Before](fixture-backup-rejected-mobile-before.png) / [After](fixture-backup-rejected-mobile-after.png) |
| Native text/image paste after reload | [Before](fixture-clipboard-pasted-desktop-before.png) / [After](fixture-clipboard-pasted-desktop-after.png) | [Before](fixture-clipboard-pasted-mobile-before.png) / [After](fixture-clipboard-pasted-mobile-after.png) |
| Guest Home empty state | [Before](fixture-guest-home-desktop-before.png) / [After](fixture-guest-home-desktop-after.png) | [Before](fixture-guest-home-mobile-before.png) / [After](fixture-guest-home-mobile-after.png) |
| Guest editor sign-in choices | [Before](fixture-guest-signin-desktop-before.png) / [After](fixture-guest-signin-desktop-after.png) | [Before](fixture-guest-signin-mobile-before.png) / [After](fixture-guest-signin-mobile-after.png) |

[Raw final observations, comparisons and initial-run metadata](fixture-recovery-controls.json) include only generated test details, not cookie values, full libraries or personal content.

## Remaining work

Three inherited failures remain: desktop crop reopening, mobile nested-group member editing, and mobile Layers pointer/cancellation. The latter completes its reorder and Undo, then Position reports `aria-expanded=false` while Templates' search intercepts the reopen click. Source inspection finds that history clears Position without closing the side panel; that product-state change needs its own fix and retained comparison. Crop/group target geometry still needs native measurement. These are outstanding checks, not a declaration that every timeout is a product defect.

The general job now prints bounded generated-test failure contexts for that investigation. Public-runner conditions and read-only permissions remain unchanged. No production, dependency, secret, storage, authentication, billing or deployment settings change. Original requests returned HTTP 403 in independent native captures; actual provider sign-in, physical touch dragging, catalog breadth and broad parity remain unfinished. The dependent PR stack stays unmerged.
