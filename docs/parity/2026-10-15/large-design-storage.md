# Large local designs and recovery — 2026-10-15

## Compared

Review of Uploads PR #35 found two connected blockers: the original image could save to IndexedDB while its design failed to save to localStorage, and a supported 50 MiB image became a roughly 66.7 MiB base64 source in a backup rejected by the 50 MiB importer. A local review probe reproduced the failed design save under an injected 5 MiB string quota; another reproduced the backup rejection. Those were code-level tests, not measurements of a browser's actual quota.

This change follows the owner's local-file requirement. It does not add hosted synchronization, paid storage or external file transfers. Browser storage limits/eviction vary; see [MDN's storage quota documentation](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria). Transaction completion is the acknowledgment boundary, using the IndexedDB strict durability hint for design writes; see [IDBTransaction](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction). No claim of immunity from browser data clearing, eviction or device failure is made.

## Design persistence

- The `canvaisdead-designs` IndexedDB database stores a versioned `libraries` record per account/guest owner. Revision comparison and the replacement write occur in the same read/write transaction. Unsupported or malformed records fail closed. There is no localStorage design-write fallback that could quietly fork new edits.
- If an owner has no IndexedDB record, read and validate the existing `canvaisdead:<owner>:designs` localStorage array. Its first successful edit creates the IndexedDB record and retains the legacy bytes unchanged. Failed migrations retain the old data and current edits. Close older app tabs before migrating; old app versions continue to see their old localStorage copy and cannot read new IndexedDB edits. Download a backup before downgrading. Old and new stores are not transactionally synchronized.
- Edits publish in memory immediately. Autosave serializes writes and coalesces intervening edits. “Saved in this browser only” appears after the latest commit; “Saving in this browser…” identifies pending work. Failure retains current edits and retry saves those same IDs. Full-page departure warns while edits are pending/unsaved. A stale tab retains its own version for backup and asks for reload; it never adopts new data underneath an editor with independent undo history.
- Home, Projects, design creation, import and editor share this store. Create waits for success before navigation; closing its dialog prevents late navigation. Presentation is read-only, follows successful revision notifications/focus, and ignores stale/cancelled reads. Guest handoff uses the same repository, waits for account commit and rechecks pending source/account edits before acknowledging. Guest originals remain intact.

## Backup format 7

Downloads now use `.canvaisdead`, MIME `application/x-canvaisdead-backup`, and a UTF-8 newline-delimited record format. First line: `{"format":"canvaisdead","version":7,"encoding":"json-records"}`. The root is the design array. Records are JSON arrays:

| Record | Meaning |
| --- | --- |
| `["array"]`, `["object"]` | Begin a container. |
| `["key","name"]` | Set the next object property; duplicate keys are rejected. |
| `["value",null]` | A null, boolean or finite numeric value. |
| `["string"]`, `["chunk","text"]`, `["end-string"]` | A lossless string split into at most 32,768 UTF-16 code units per chunk; escaped/lone surrogates remain intact. |
| `["end"]` | End the current object/array. |
| `["complete"]` | Required final record after the complete root. |

Export constructs bounded Blob parts; import decodes the stream one record at a time instead of reading a whole library-sized string. Records are limited to 256 KiB and nesting to 64 levels, above the supported design schema. There is no total-file cap for this format. The reconstructed editable library still must fit browser memory and available storage. Unknown format versions, malformed records, truncation, extra data, invalid UTF-8, invalid models and external/unsupported media are rejected before any import update. Keys are reconstructed into objects without prototypes. Imports create new copies and preserve existing designs.

Existing JSON backup versions 1–6 are still accepted up to 256 MiB; they retain native whole-file JSON parsing. Earlier clients cannot import version 7. The clipboard retains its separate 50 MiB payload cap. The new backup format preserves all existing design/page/element fields, source bytes, crops, flips, groups, notes and text spacing; no image recompression or content upload is introduced.

## Verification and remaining work

Lint, typecheck, all 345 unit tests across 29 files and the production build pass using the existing dependency overlay. Playwright discovers 132 scenarios across 23 files, including eight new desktop/mobile instances; none ran in a browser.

- Unit evidence: asynchronous save acknowledgment/coalescing, failure/retry, blocked reads, stale revisions, account isolation, presentation cancellation, pending guest/account work, 50 MiB source preservation, legacy backup compatibility, malformed/truncated record rejection and Unicode chunk boundaries. A real generated backup containing four 50 MiB encoded source payloads exceeds 256 MiB and round-trips without whole-file text access. These payloads test encoding/capacity, not PNG decoding or real IndexedDB quotas.
- Browser fixtures now inspect and seed the real IndexedDB library, and quota tests abort actual IndexedDB operations. New desktop/mobile scenarios cover legacy migration with untouched recovery bytes, conflicting open editors, and an incompressible PNG over 5 MiB through insertion, reload, presentation and backup import. These are authored scenarios, not executed evidence.
- Real browser execution and before/after captures at 1440×900 and 390×844 remain unavailable. The earlier launch failures still apply and no browser tool is exposed. `large-image-library.png` is a planned capture filename, not a captured screenshot. No visual match is claimed.
- Whole libraries are still structured-cloned and written together; source strings remain embedded in every placed copy. Large-library latency/memory, background suspension/eviction, old-client concurrency and migration failures need browser testing. Guest fingerprinting/recovery still uses JSON serialization internally and needs further work for libraries/designs approaching engine string limits. Unplaced Uploads/Trash are outside design backups and guest handoff. These remain required work, not justified parity exceptions.
- No dependencies, auth/session protocols, environment variables, secrets, analytics settings or payment behavior change. Existing hosting/authentication/consented analytics remain external services with separately unverified costs.
