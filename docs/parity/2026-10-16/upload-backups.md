# Portable Uploads recovery — 2026-10-16

## Compared workflow and local-storage exception

The prior Uploads and handoff PRs preserve originals locally, but design backups include only images already embedded in artwork. Clearing browser data could therefore remove unplaced uploads and retained Trash without a library restore path. This change closes that recovery gap under the owner's requirement to keep files local and avoid new paid storage. The added backup controls are an intentional local-storage alternative, not a claimed match to the reference's hosted storage interface. No new Canva account or screenshot observation was possible.

Uploads now includes **Back up or restore uploads**. Export waits for this tab's current imports/actions, then reads one consistent saved snapshot without pruning Trash. It includes all saved assets regardless of the search/tab/selection; failed imports are excluded with an explicit message. Original files, previews, names, dimensions and timestamps are preserved. Already expired/deleted records removed by normal library refresh cannot be recovered without an earlier backup.

Restore reads and validates the entire archive before queueing any writes, checks that the destination library is readable, and creates independent active copies. Files from archived Trash also return to Images; their original creation dates remain, while update dates reflect restore time. Existing account records are never replaced. Each file uses the existing sequential import queue and commit acknowledgment; storage failures retain prepared copies and original bytes for retry. This is not an atomic whole-library import: successful files remain if later files fail. Retry uses the same IDs; selecting the archive again intentionally creates new copies.

Cancelling validation adds no files. Cancelling export starts no download. Once restore is saving, the normal per-file queue controls handle cancellation/retry; pending jobs survive panel navigation in this tab and are included in guest handoff settlement. The source archive stays on the user's device and remains usable after browser reload.

## Archive format 1

Extension `.canvaisdead-uploads`, MIME `application/x-canvaisdead-uploads`. The ASCII prefix is `CanvaIsDead uploads\n`. A record is a four-byte unsigned little-endian UTF-8 byte length, then a JSON object; each record is at most 64 KiB.

The first record contains `format: "canvaisdead-uploads"`, `version: 1`, and the asset `count`. Each asset record contains its ID/name/MIME/dimensions/timestamps, `originalBytes`, `thumbnailBytes`, `originalHash` and `thumbnailHash`. Its exact original bytes and PNG preview bytes follow immediately. After the declared assets, the required final ASCII marker is `END\n`; extra/truncated bytes are rejected. Blob hashes use SHA-256. These detect damaged payloads, not authorship or authenticity.

Originals retain the existing 50 MiB limit; PNG previews allow 1 MiB (the normal importer creates 240-pixel previews). Records validate IDs, names, supported raster MIME types, dimensions, timestamps, duplicate IDs, bounds, UTF-8, source signatures and checksums. Metadata and bytes are never interpreted as HTML, paths or external URLs. Restoring does not add a new image codec; actual decoding still happens through browser image support. Older app versions do not support this archive format.

Blobs are assembled/sliced without a whole-library string or ArrayBuffer. Hashing reads one bounded original at a time; files remain binary without base64 expansion or recompression. There is no fixed total-file cap, but browser memory, storage quota and available device disk remain real limits. Account owner IDs, handoff receipts, design layouts, favorites and pending/failed imports are not archived. Design backups remain separate.

## Evidence and remaining checks

Lint, typecheck, all 364 unit tests across 31 files and the production build pass with the existing dependency overlay. Playwright discovers 148 scenarios across 24 files, including six new backup instances. Eight new unit cases cover archive/recovery behavior; one adds analytics allowlist compatibility.

The unit suite covers bytes/previews/Trash metadata, Unicode names, an actual archive over 256 MiB without whole-file text/byte reads, corrupt checksums, invalid/duplicate metadata, truncation, excessive records, versions, cancellation, independent active copies and partial quota retry without re-encoding. Its capacity fixtures validate the archive format, not real PNG decoding or IndexedDB quotas.

Three new browser scenarios at both configured widths cover the UI download/restore cycle, unplaced originals and Trash, original-byte downloads, repeat import and reload, invalid archives, an aborted IndexedDB write with retry, and cancellation before queueing. `uploads-backup-restored.png` is a planned artifact, not an available screenshot. The Chromium/WebKit startup failures from merge review still block execution. Desktop/mobile focus, wrapping, native file dialogs, large real-image archives and download behavior remain unverified. No visual match is claimed.

Optional existing website analytics distinguishes `library: "designs" | "uploads"` on backup outcomes; old callers without the property remain valid. Full initial restore success and partial failure are distinct; cancellation emits no outcome. No file names, bytes, checksums, sizes or account IDs are included. Consent, host restrictions, configuration and disabled local capture are unchanged.

No new dependency, service, auth/provider behavior, environment variable, secret or payment change. All archive/file processing stays in the browser. Existing optional analytics remains the documented exception for allowlisted usage metadata.
