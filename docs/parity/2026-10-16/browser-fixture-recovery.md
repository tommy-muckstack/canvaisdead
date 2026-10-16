# Recover browser coverage for backup, clipboard and guest entry

Date: 2026-10-16. Follow-up based on PR #55. Native verification is pending; no product behavior or original/clone parity match is claimed.

## Evidence and change

[Parent run 38933635387](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38933635387) has six failures before the intended application assertions can finish:

- The invalid-backup test's global alert locator also matches the Next.js route announcer. Scope it to Local design files. Retain the card-count check and compare the exact persisted library before rejection, afterward and after reload.
- Native Clipboard.write rejects the existing PNG bytes before paste. Generate a complete patterned PNG with the browser encoder and validate its dimensions before writing it to the system clipboard. The seeded one-pixel image also uses the existing complete PNG fixture encoder.
- A new guest's empty grid has no rendered height. Assert the visible Your designs heading and empty-state copy, attached grid and zero cards instead of requiring the empty grid itself to have an area.

Keep the original plain-text and design-name-field paste checks. After native raster paste, check saved dimensions and decoded left/right pixels, one-step Undo/Redo, exact artwork through reload, and the saved name. Guest coverage now visits sign-in from both Home and the editor, checks callback destinations and Google/email-only choices, and verifies local design bytes through back navigation and reload. No real provider sign-in is attempted.

## Verification and retained comparison

Local lint, typecheck and production build pass. Native verification is pending. The regression inventory remains 186 instances, partitioned without overlap into 76 focused, 32 storage and 78 general cases. The unchanged production parent is rebuilt separately and the same three repaired scenarios run there as six baseline flows, in addition to the existing eighteen captures. Before/after here means parent/current production builds reached through valid fixtures, not a visible UI change.

The evidence helper records visible backup-error, pasted-artwork, empty guest Home and editor sign-in states at both required widths, plus computed styles/geometry and accessibility snapshots. Logged details contain only generated test metadata, not cookie values, full libraries or personal content.

All source changes are test/capture/workflow code. The general job now prints bounded generated-test failure contexts for the remaining interaction investigation. Existing public-runner conditions and read-only permissions remain unchanged; no dependencies, secrets, storage, authentication, billing or deployment settings change. Remaining crop, grouping and mobile Layers failures still need investigation. Original requests returned HTTP 403 in independent native captures; this work does not establish full parity.
