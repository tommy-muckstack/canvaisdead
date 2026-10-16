# Guest originals follow sign-in — 2026-10-15

## Compared and changed

Source review after the Uploads/storage PRs found that sign-in adopted only the design library. Its embedded images survived, but the separate original-file library stayed under the guest owner and disappeared from the new account's Uploads panel. This contradicts the expected continuity of the owner's free editor. The chosen equivalent remains local, under the owner's no-hosted-files requirement. No new original-app screenshots or account observations are available.

Guest handoff now waits for active imports and file-management actions in the current tab's guest/account stores, validates both libraries, then copies active originals and nonexpired Trash into the account's Uploads database. An unreadable account library blocks copying/acknowledgment so newly copied files cannot become inaccessible behind a read error. Image bytes, preview bytes, names, dimensions and creation/update/Trash times stay intact. Expired Trash is skipped without renewing its retention. The transfer's source snapshot is read-only; normal library refresh still enforces the existing expiration policy.

Failed imports retain their original File in memory. Recovery offers original downloads, retry and explicit skip for both guest and account jobs. Saved originals can be downloaded individually, including nonexpired Trash. Skipping an import does not change the source file on the user's device. Original downloads are not a replacement for a portable Uploads-library backup; that remains unfinished.

## Transaction and retry behavior

Uploads database version 2 retains the existing `assets` store and adds `meta` (key `library`, version 1, opaque revision) and `handoffs` (keyed by copied asset ID). Every normal asset mutation/expiration updates its library revision in the same transaction. Unsupported metadata/records fail closed. Version changes close existing connections; blocked upgrades ask to close other tabs. Older clients opening database version 1 cannot read version 2, so downgrades require care and retained source files.

Each source file's receipt ID is a SHA-256 fingerprint of its guest owner, original ID, declared metadata and hashes of both Blobs. Hashing reads one original at a time under the existing 50 MiB original cap. The receipt and copied asset are added in one transaction; failure leaves neither committed. Existing destination IDs without a matching receipt are preserved and reported as conflicts.

Receipts persist after an account copy is edited, trashed or permanently deleted. A retry skips that previously copied source version, preserving the user's later account action. A changed guest version has a different fingerprint and becomes another independent copy. Partial transfers therefore resume without replacing account work or recreating intentionally deleted copies. Copying needs sufficient local quota for guest and account originals; failure leaves the guest session recoverable.

The source revision and both in-memory queues are checked around copying and again after design transfer. Only then does the existing verified metadata-only session acknowledgment run. File bytes, filenames and content hashes are never sent in that request or logged to analytics. Successful file commits broadcast only a local change notification. There is no atomic transaction spanning two databases and a network acknowledgment: edits in other tabs after the final snapshot/check are not continuously transferred. Shared guest-cookie coordination across other subapps remains separate work.

## Evidence and outstanding verification

Lint, typecheck, all 355 unit tests across 30 files and the production build pass with the existing dependency overlay. Playwright discovers 142 scenarios across 24 files, including ten new instances; browser execution remains unavailable.

Ten unit cases cover original/Trash preservation, unreadable source/account libraries and retry, stable/distinct receipts, partial failures and retry, later account edits/deletion, source revision changes, pending/failed guest and account imports, file-action settlement, final-check races, acknowledgment ordering and notification failure. Repository doubles check orchestration contracts; they do not prove real IndexedDB behavior.

Five browser scenarios, at both configured widths, load the actual client repository/transfer modules into an isolated fixture and use native IndexedDB. They cover v1 asset retention, read-only snapshots, a quota abort between asset/receipt requests, retry after rename/delete, concurrent source changes, ID collisions, unsupported metadata and unreadable account assets. The TypeScript fixture compiler loads seven real modules successfully in a Node smoke check; this does not execute IndexedDB. No production test endpoint, auth bypass, extra dependency or persistence mirror was added.

Browser automation remains unavailable, so these scenarios, full Google/email handoff and native recovery controls have not run. The latest merge-review attempts failed before opening a page: Chromium failed its macOS Mach-port bootstrap, and WebKit aborted, including approved outside-sandbox retries. Before/after screenshots and computed-style comparisons at 1440×900 and 390×844 remain missing. Capture progress, failure/retry, pending originals, filename wrapping, keyboard focus and source/account separation. Also exercise storage blocking/eviction, upgrade contention, suspended tabs, large libraries, all supported image formats and mutations during confirmation before calling the flow verified.

No changes to session verification, provider choices, secrets, environment variables, hosting, paid services, payment behavior or analytics configuration. All originals and receipts stay in this browser/origin.
