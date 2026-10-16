# Large original-image rendering

## Compared and reproduced

The [review of PR #35](https://github.com/tommy-muckstack/canvaisdead/pull/35#pullrequestreview-5545945919) identified a failure remaining in the combined #39 tree. A complete 4096 × 4096 RGB PNG encoded with stored DEFLATE blocks is 50,343,487 bytes, below the existing 50 MiB / 250-million-pixel upload limits. Eight instances have 536,997,392 source characters, above the tested V8 single-string ceiling of 536,870,888. Both the editor's joined element markup and `toSVG` threw `RangeError: Invalid string length`. A project thumbnail failure could also prevent the library and its backup controls from rendering.

This comparison uses actual production render functions and a generated PNG. It is not a native browser reproduction, measured quota result or visual comparison with Canva. No new original-app screenshot was captured. The previous render geometry is retained in `tests/fixtures/svg-artwork.json`, captured from published parent #39's equivalent local tree. It covers all native element types, escaped/spaced text, rotated opacity, image crops and each flip combination.

## Change

- Build a shared SVG node tree, keeping each original source as an attribute reference. React renders separate elements for the editor, templates, Projects/Trash, page strip/grid, grouped Layers and presentation. Text remains an escaped text node; no user artwork is assigned as aggregate HTML.
- Use the same geometry to write portable SVG in bounded escaped chunks, retaining UTF-16 surrogate pairs between Blob parts. Original sources remain embedded and unchanged. Yield and check cancellation while building a single large SVG.
- Package multiple SVG pages from Blob parts with CRCs calculated over 64 KiB reads. Do not call `arrayBuffer()` on an entire SVG. Preserve page order, UTF-8 filenames, local/central headers, transparency, scale and private-note exclusion.
- A single SVG has no fixed total-file cap. ZIP32 output stays below its 32-bit size/offset sentinel and below 65,535 entries; ZIP64 remains unfinished. Raster/PDF outputs retain their existing 256 MiB limit. Memory, browser Blob/DOM capacity and device storage still constrain all paths.

The SVG node model follows [SVG image/viewport semantics](https://www.w3.org/TR/SVG2/embedded.html#ImageElement). The archive retains stored ZIP entries and CRCs described by [PKWARE's ZIP specification](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT). These are format references, not evidence of visual parity. The [Vite JSX transform option](https://vite.dev/config/shared-options#oxc) is enabled only for unit tests so they execute the actual TSX components; Next's configuration is unchanged.

## Verification

- Lint, typecheck, production build and 379 unit tests across 35 files pass with the existing documented dependency overlay. No dependency or lockfile change. The full unit run uses two workers to bound concurrent capacity-test memory.
- Seven new unit cases cover parent-renderer geometry, real React markup and text escaping, editing exclusion, Unicode chunk boundaries, cancellation within one SVG, Blob ZIP compatibility/cancellation, ZIP32 overflow, and the exact large-image regression. The capacity case streams the actual React editor/page/layer components into a bounded Node consumer, checks the full SVG against an independent Node SHA-256 digest, and packages the result without a whole-file buffer. This does not establish browser painting or IndexedDB behavior.
- An independent Python `zipfile`/XML/zlib/hashlib probe validates a 536,998,824-byte multi-page SVG ZIP. Both SVG entries are 268,499,257 bytes (above the former output cap). ZIP CRCs, XML, all eight embedded-original SHA-256 values, PNG chunk CRCs and decompressed scanline length/filter bytes pass. The generated archive and probe output remain local temporary artifacts, not committed media.
- Playwright discovers 158 scenarios in 26 files. Four new desktop/mobile instances cover all changed preview surfaces and a native save/reload of the capacity fixture, with screenshot capture paths. They are authored, not executed. The preceding review's Chromium launch still failed during macOS Mach-port bootstrap, including an outside-sandbox retry; the in-app browser execution tool remains unavailable. No before/after browser screenshots are claimed.

## Still required

Run the new cases at 1440 px and 390 px alongside existing crop/flip/text/export tests. Verify actual image decoding/paint, lazy Layers previews, grid/presentation views, pointer hit targets, text editing and download cancellation; capture paired screenshots. Test native IndexedDB record-size/memory/quota limits and recovery without assuming that Node streaming proves storage capacity. Whole-library structured cloning and database writes, corrupt raw-record recovery, raster/PDF output limits and ZIP64 remain separate work. This PR changes no saved design/backup schema, authentication, environment, secrets, analytics, hosted service or payment behavior. Keep the stack unmerged pending the remaining verification.
