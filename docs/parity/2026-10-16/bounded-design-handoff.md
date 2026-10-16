# Large local design handoff

This fixes the sign-in blocker reproduced in the review of PR #36. It is stacked after the Uploads backup work; it is not a visual-parity sign-off.

## Before and after

| Case | Before | Proposed behavior and evidence |
| --- | --- | --- |
| Eight designs with a 50 MiB embedded source each | The repository-to-string adapter attempted over 559 million source characters and threw `RangeError: Invalid string length`; sign-in never completed | Structured repository reads/writes transfer the fixture into an equally large existing account library; no whole-library serialization. Node unit test passes. |
| One design with eight such images | Canonical fingerprint input exceeded the same single-string limit | Bounded canonical JSON chunks feed incremental SHA-256. The full digest matches Node's independent SHA-256 across the 32-bit message-bit-length boundary. |
| Retry an old successful copy after editing it in the account | Original code derived a stable `guest-<sha256>` ID | Preserve the exact old byte representation/digest and copy ID. Retry keeps the account's edited copy. |
| Concurrent source/account edit or failed destination write | String comparisons plus the repository's revision guard | Source/target revision checks, immutable pending-array identity and atomic destination compare/write retain both originals and reject stale work. |
| Large fingerprint computation | One large serialization and Web Crypto input | Bounded pieces, event-loop yield after each MiB, per-design progress. Browser responsiveness still unverified. |

Canva's hosted storage is not reproduced: the owner requires local files and no new paid services. This is the local continuity/recovery path needed under that constraint. Source/user media never leave the browser. Nothing changes Google/email authentication, cookie signing, session acknowledgment, provider settings or analytics.

## Implementation and compatibility

`copyGuestDesigns` now uses `DesignRepository` directly; the obsolete string adapter is removed. Saved and pending guest versions are kept, unchanged content yields the same copy ID, and account copies are not overwritten. The editor return path still maps to the selected copy. Guest arrays come from the immutable design store; any intervening edit/save that changes the pending value requires retry. Legacy source revisions also compare the original retained localStorage bytes. The destination commits once using the existing atomic repository revision check and is re-read afterward.

The content-ID helper implements incremental SHA-256 as specified in [FIPS 180-4](https://nvlpubs.nist.gov/nistpubs/fips/nist.fips.180-4.pdf), solely for local content identity. It is not used for credentials, signatures or cookie verification and carries no certification claim. JSON string pieces contain at most 16,385 UTF-16 code units (one extra preserves a boundary surrogate pair); UTF-8 encoding/escaping stays below 100,000 bytes per piece. Object-key ordering, integer-key enumeration, omitted values and Unicode escaping retain the former canonical representation. No new dependency, network endpoint, database schema or backup format is introduced.

## Validation and remaining work

- Unit coverage compares known SHA-256 answers and Node's implementation across block/padding/chunk boundaries; compares old canonical JSON and legacy IDs including Unicode/control characters; verifies yielding; and exercises the actual >500 MiB encoded-capacity cases, concurrent revisions and retry preservation.
- The capacity fixtures deliberately use encoded bytes and repository doubles. They do not prove that a particular device can decode, clone, persist or recover that volume, or that it has the required quota.
- Three Playwright scenarios at both widths use the actual client modules and native IndexedDB. They cover old-ID retries from legacy storage, concurrent destination commits, and a generated PNG larger than 5 MiB through transfer, reopen and decoding. They are authored but unexecuted; they do not simulate a successful Firebase sign-in or certify the recovery UI.
- Chromium still fails during macOS Mach-port bootstrap, including the outside-sandbox retry in the preceding merge review. The in-app browser runtime is not exposed. No new before/after screenshots are available.
- Whole libraries are still cloned/read/written together and media are embedded per placement. Browser memory, quota, latency, suspension and eviction remain real limits. There is no transaction spanning guest reads, account writes and network acknowledgment; this remains a snapshot transfer. Invalid raw-record recovery still falls back to a whole JSON string and needs its own bounded recovery format. Cross-subapp guest coordination remains unfinished.
- Lint, typecheck, all 372 unit tests in 33 files, and the production build pass using the existing documented dependency overlay. Playwright discovers 154 scenarios in 25 files; none of these new browser cases has run. Leave the stack unmerged until native browser/storage and real Google/email handoff verification succeed.
