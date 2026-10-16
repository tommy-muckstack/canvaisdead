# Blob-backed local design storage

Date: 2026-10-16. Scope: the native save failure found in the [merge review](native-merge-review.md). The previous Chromium run rejected the eight-image library at `537002514` serialized bytes against a `133169152`-byte limit, at both widths. This change is stacked on the CI PR; leave it unmerged pending native verification.

## Change

New IndexedDB records contain `{version: 2, owner, revision, data: Blob}`. The payload reuses the bounded version 7 design-record encoding already used by local backups. Only small metadata and a Blob reference cross the structured-value boundary; original media is retained without resizing or recompression. Encoding yields periodically before opening the transaction. Reading retrieves the Blob and closes the transaction before asynchronous decoding. The complete library still needs to fit available memory and storage; this does not promise unlimited capacity or avoid rewriting the library on save.

The same atomic transaction compares the expected revision and replaces the payload. Existing localStorage and version 1 IndexedDB records remain readable; migration occurs only on a successful save. Legacy localStorage bytes remain untouched. An aborted write leaves the previous revision/payload intact. Future record versions fail closed. Older clients reject version 2 instead of silently overwriting it; back up before downgrading and close old tabs.

The shared codec reconstructs the existing design model. Local storage retains its existing validator; portable backup imports additionally enforce the existing embedded-media/plain-color rules. No backup format/version changes. Unknown non-JSON structured fields are rejected rather than silently discarded, preserving the previous saved record. Malformed raw Blob payloads remain downloadable byte-for-byte even when their metadata is unreadable; legacy recovery writes bounded JSON. A corrupt recovery file is not automatically considered a valid import.

## Verification

- Local lint, typecheck, **384 unit tests in 36 files**, and production build pass with the documented dependency overlay. New cases cover local-versus-portable validation, asynchronous bounded encoding, UTF-16/escaping, unsupported structured fields and exact raw recovery bytes.
- Playwright discovers 32 targeted instances across both widths: the exact eight-original rendering regression, version 1/localStorage migration, transaction abort, concurrent revisions, unreadable/future records, backup/restore above the native record limit, guest transfer and the existing handoff/storage flows. Tests exercise real IndexedDB and the production modules.
- The additional full workflow uses the complement of that filter, so no existing cases are dropped. The broader suite still has failures from the first run; this PR does not claim to resolve unrelated labels, fixtures, keyboard/pointer or library behavior.
- The small-test IndexedDB inspection helper now decodes production v2 records. It still seeds v1 fixtures for migration coverage. Large cases use the production repository directly. Empty-grid setup and the conflict-alert selector were corrected so storage scenarios reach their intended actions.
- Native results are pending. No retained or original/clone paired screenshots are available; no visual parity claim.

All design, upload, backup and recovery processing stays local to the executing browser/device. No dependency, hosted service, secret, environment, authentication, analytics or payment change. CI uses the existing free standard public-repository runners, with no artifact or cache uploads.
