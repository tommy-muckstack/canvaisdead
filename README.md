# CanvaIsDead

Free, open-source design editor. Part of the [IsDead series](https://yourappisdead.com). Served at `https://yourappisdead.com/canvaisdead`.

**Status: work in progress.** See [the parity report](docs/PARITY_REPORT.md) for verified behavior, open PRs, and remaining gaps. Surfaces follow `templates/marketing-site.md` in `@isdead/design`: one marketing page (`/`, price comparison at `#pricing`), `/login`, and the app at `/app`.

## What works
- Dashboard with search, 10 size presets, a Create a design picker, custom dimensions, your designs (saved in the browser) and original templates.
- Editor: shapes (rectangle, circle, triangle, star, line), text (heading/subheading/body, 5 fonts, size, bold/italic, alignment, in-place editing), image uploads, page color, layers panel, drag/resize/rotate with smart-guide snapping, arrow-key nudge, duplicate/delete, z-order, align-to-page, opacity, corner radius, border, undo/redo, canvas resize, zoom.
- Export PNG, JPG, SVG and flattened RGB PDFs locally, with page selection, multi-image ZIPs, size/quality and transparency controls. No watermark. Autosave to IndexedDB per user, acknowledged after the local transaction commits.
- Multi-page designs: add, duplicate, title, delete and reorder pages; thumbnails and grid view; page operations in undo/redo. Existing single-page libraries still open. Resize affects every page; templates apply to the selected page.
- Multiple elements: Shift-click, drag a selection box, Ctrl/Cmd+A, or use Select multiple for touch. Move/nudge, copy, delete, lock, align, change opacity and stacking, scale uniformly and rotate the selected objects together. Each completed pointer gesture is one undo step; Escape cancels it. Persistent groups support nested membership, individual member editing, grouping/ungrouping shortcuts and local backups.

## Known gaps
- Designs and original uploaded files stay in IndexedDB in this browser, scoped to the current account. Hosted cloud sync is intentionally excluded under the local-only/no-new-cost requirement. Existing Firebase authentication and Vercel hosting are separate services; their account costs have not been verified.
- No stock photo/video library, brand kits, collaboration, animation, editable/vector PDF, PPTX/video/GIF export or AI tools.
- Image cropping, group selection, multiple-element operations and rotated geometry have unit coverage; visual and pointer behavior still need browser verification. Photo filters, crop straightening, Smart Crop and background removal remain unfinished. Group outlines use axis-aligned bounds; exact rotation pivots and empty-space hit areas remain unfinished.
- Scrolling page view and selecting several pages together in the editor remain unfinished. Download page selection and presentation navigation are implemented; real-browser verification remains pending.

## Local backups
Use **Back up designs** in Home → Your designs or Projects to download a `.canvaisdead` file containing the full library and embedded uploaded images. Version 7 writes bounded JSON records and imports them incrementally, avoiding a single library-sized string. **Import backup** restores that file as new editable copies without replacing existing designs. Import validates the entire file before adding designs and accepts embedded raster images only; external image URLs are rejected. Existing version 1–6 JSON backups remain importable up to 256 MiB. Version 7 has no fixed total-file cap; the reconstructed library must still fit browser memory and storage. Earlier app versions cannot import version 7 files.

Legacy JSON versions 2–6 added groups, crops, text spacing and image flips. New design downloads use version 7 for all artwork; older app versions reject unsupported versions instead of silently dropping editing behavior.

If browser storage is full or unavailable, edits stay in this tab and a recovery notice offers retry and a local backup download. Keep the tab open until saved or downloaded. Clearing browser data removes the saved library; keep backups somewhere safe on your device. No backup is uploaded to a server.

Legacy localStorage libraries are read when no IndexedDB library exists. The first successful edit saves a versioned IndexedDB record; legacy bytes remain untouched as a recovery copy. Close older app tabs before migrating. Older deployments will only see that older copy, so download a backup before downgrading. Concurrent new clients use atomic revision checks: a stale tab keeps its edits for backup and asks for reload instead of overwriting newer saved work. Presentation and guest handoff read the same IndexedDB library. [Migration and verification details](docs/parity/2026-10-15/large-design-storage.md).

## Create a design

Use **Create** in the rail to browse or search blank design sizes. **Custom size** in the homepage row opens width, height and units directly. Choose pixels, inches, millimeters or centimeters, lock the aspect ratio, swap orientation, or reuse a size from an active local design. Dimensions use 96 pixels per inch (the same coordinate system as PDF export) and round to whole pixels. Each side must be 40–8,000 pixels and the area must not exceed 25 million pixels.

The editor opens in the same tab after a successful local save. If that save fails, the dialog offers retry and a backup; retry opens the same design after saving it. Dedicated Docs, Sheets, video, website and other unavailable editors remain implementation gaps, with clear explanations in the picker and no paid gates. Static US Letter/A4 designs are available under Print. Physical-unit metadata and the reference's new-tab preference remain outstanding.

## Auth
Login and signup support only email/password and Google, with email password recovery. No Facebook, Apple, Microsoft, workplace SSO or alternative-provider choices. Shared Firebase project `yourappisdead`, helpers in `lib/isdead-auth` (vendored from `isdead-design/auth`). The session cookie `isdead_session` has path `/`, so one sign-in covers every IsDead app. Env: `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_SERVICE_ACCOUNT_JSON`. Without them, `/login` shows "Sign-in not configured". The single demo account ("Use the demo account") is available outside production or with `DEMO_MODE=1`.

Guests can enter `/app` without signing up when the existing guest-session configuration is enabled (production requires `AUTH_SECRET`; `GUESTS=0` disables it). Signing in copies guest designs and the original Uploads library into that account's storage **in the same browser**, retaining guest originals and preserving existing account files. Uploads copy even if they have not been placed in a design. Nonexpired Trash keeps its original deletion date. Unsaved guest edits are included when signing in through this tab. Failed copies keep the guest session available and offer retry and local backups; keep the tab open until unsaved edits are copied or downloaded. This does not sync designs across devices or continuously transfer edits from other tabs. See [the handoff protocol](lib/isdead-auth/README.md#canvaisdead-local-handoff).

## Develop
```
npm install
npm run dev        # http://localhost:3000/canvaisdead
npm test           # unit tests
npm run lint       # ESLint: app, components, libraries, tests and scripts
npm run typecheck
npm run build
npm run test:e2e    # Playwright: 1440px and 390px flows; starts the production server
# npm run test:e2e -- --list lists cases without launching a browser
```
Lint uses pinned ESLint 9, TypeScript rules, and React hook/order/dependency rules with zero warnings allowed. Generated files and vendored third-party UI assets are excluded; app auth helpers remain covered. Install dependencies normally before running checks. The legacy `shots` script still needs output-path and selector maintenance; the Playwright suite is the current regression entry point.

Theme and font: `vendor/isdead-design` (OFL fonts, see `fonts/*/OFL-*.txt`). Independent project, not affiliated with or endorsed by any other design platform; third-party trademarks belong to their owners. Apache-2.0.

## Website analytics

Optional PostHog analytics uses a shared `website_*` taxonomy with `app_id=canvaisdead`. See [the analytics contract](docs/ANALYTICS.md) for production configuration, consent, event properties, privacy boundaries and rollout to other subapps. Design/media files remain local; consented usage metadata goes to the existing US PostHog project. No session replay or automatic DOM capture.

## Presenting local designs

Use **Notes** to save private notes for each page. **Present** starts at the selected page; the adjacent menu offers **Presenter view** (separate audience window) and **Autoplay**. Use arrows/space, tap/swipe or the page number to navigate. Escape returns to the editor. Presenter view shows notes, the next slide and elapsed time; the audience sees slide artwork only. Autoplay offers timing and looping.

Presentation reads saved designs from this browser. Save errors must be resolved before opening it. Live edits follow successful local saves and can be disabled. Audience synchronization works only between windows on the same origin/device; it is not public link sharing or cross-device remote control. Fullscreen and popups depend on browser support/permission. No server receives designs or media.

## Local downloads

**Share → Download** supports PNG, JPG, SVG, PDF Standard and PDF Print. Choose **All pages**, **This page**, or **Custom pages** (for example `1, 3-5`). Custom ranges are deduplicated and exported in document order. Multiple PNG/JPG/SVG pages form one ZIP; PDF pages form one PDF. Speaker notes are excluded. Downloads snapshot the document before rendering and can be cancelled without saving a partial file.

PNG/JPG/SVG support 0.5–4× dimensions; JPG supports quality control, and PNG/SVG support transparent page backgrounds. SVG text references fonts rather than embedding them. PDFs currently flatten artwork into RGB images at 96 DPI (Standard) or 300 DPI (Print), using a 96-pixel-per-inch page coordinate system. Physical-unit metadata, selectable/vector text, CMYK, bleed/crop marks, passwords, video/GIF and PPTX remain gaps, not paid features.

Optional download preferences stay in this browser, keyed by canvas dimensions; page selections are never saved. Uncheck **Save download settings** and download again to forget those preferences. Rendering is sequential; canvases above 8,192 pixels on either side or 32 million pixels total are rejected before allocation. Raster/PDF outputs retain a 256 MiB limit. SVG downloads use bounded chunks without a fixed total-file cap; multiple SVG pages use a ZIP32 archive below 4 GiB and 65,535 entries. Memory and device storage still bound actual capacity. These are implementation limits, not plan tiers. All rendering and packaging happen locally.

The editor, project/page previews, Layers and presentation build separate SVG elements instead of joining original image sources into one page-sized string. Crop, flip, rotation, opacity, text spacing and paint order share geometry with SVG downloads. Original media stays embedded and unchanged. A regression covers eight images whose combined sources exceed JavaScript's string limit; native browser painting, storage/reload and download behavior still require verification. [Rendering evidence and remaining checks](docs/parity/2026-10-16/bounded-artwork-rendering.md).

## Uploads library

Open **Uploads → Upload files** to choose multiple PNG, JPEG, WebP, GIF or AVIF images, or drop files onto the panel. Originals are saved in this browser's account-specific library with separate small previews; the original bytes are not resized or recompressed. Select an image to add it to the page, reuse it in another design, or drag a thumbnail/file onto the desktop canvas. Search uses filenames and file types.

The file menu offers **Download original**, **Rename**, **Select items** and **Move to trash**. Trash supports restore and confirmed permanent deletion; files expire after 30 days while the library is open. Removing an upload leaves copies already placed in designs intact. Failed imports retain the file for retry while the tab remains open. Video/audio editing and other file formats remain unavailable.

Originals currently allow up to 50 MiB and 250 million pixels per file, subject to browser decoding/storage capacity. Placed copies preserve embedded source bytes in IndexedDB designs. Version 7 design backups support large and multiple originals without the former 50 MiB file cap. Browser decoding, storage capacity, eviction and large-library performance still require direct testing. Unplaced originals and Trash have a separate Uploads backup, described below. Guest account handoff copies active originals and nonexpired Trash locally; failed copies retain the guest session, offer original downloads and can retry without overwriting account edits or reviving permanently deleted copies. Keep source files; clearing browser storage removes the local library. See [comparison and verification limits](docs/parity/2026-10-15/local-uploads.md).

In **Uploads → Back up or restore uploads**, choose **Back up uploads** to download a `.canvaisdead-uploads` file with all saved originals, previews and metadata, including retained Trash. It waits for current imports; failed imports are excluded and reported. Search filters and selection do not limit the snapshot. No account identifiers or handoff receipts are exported. Keep a design backup too: this archive contains the Uploads library, not page layouts or design images that were never added to Uploads.

**Restore uploads** validates the complete archive and file checksums before queueing any copies. Copies get new IDs and return to Images, including archived Trash; original creation dates remain and update dates reflect restoration. Existing uploads remain intact. Interrupted/quota-failed copies retain their bytes in the import queue for retry while the tab stays open. Re-importing the archive intentionally creates another set of copies. Cancel while validating to add nothing; after saving starts, individual pending files use the normal queue controls. Archive records are bounded and originals stay binary, with no fixed total archive cap; each original retains the 50 MiB limit and each preview permits 1 MiB. Memory, disk and browser storage still limit capacity. [Format, evidence and remaining browser checks](docs/parity/2026-10-16/upload-backups.md).

## Elements library

Open **Elements** to browse original shapes and graphics. Type keywords and press Enter, choose a category or **See all**, and narrow results by color or orientation. **More** on an asset offers Star/Unstar, Find similar and View collection. Search and filters stay in place when switching panels.

Click/tap an asset to insert it, or drag it onto the page on desktop. Multi-part graphics are editable groups; use the existing group/member controls to change their parts. Additions use one undo step and stay local through saves, backups and exports. The library contains 30 original vector assets; other media categories explicitly describe their current availability.

**Recently used** contains actual additions, and **Starred** contains your chosen assets. Both are saved in this browser for the current account, with no cloud sync. Preference storage errors have a separate retry notice; design saving is unchanged. These lists are not part of design backups or account handoff. See the [comparison notes and original asset preview](docs/parity/2026-10-15/elements-library.md) for verification and remaining gaps.

## Grouping elements

Select multiple elements and use **Group** on the floating toolbar, or press Ctrl/Cmd+G. Groups can contain other groups. Click a selected group again to select a member; drag, resize, rotate or edit its text while keeping membership. Use **Select parent group** or Escape to return to its parent. **Ungroup** or Ctrl/Cmd+Shift+G dissolves the selected group; on an individual member it removes that member from its immediate group. Layers exposes nested groups and individual members.

Groups move, align and reorder as units. A group containing a locked member stays fixed until unlocked; an explicitly selected unlocked member remains editable. Duplicates preserve nested membership with independent group IDs. Removing members collapses empty or one-child groups. Grouping separated layers gathers them at the frontmost selected layer. Membership, edits and undo use the same local browser store; artwork exports preserve appearance but do not carry editable group metadata. Nesting currently supports up to 32 levels.

## Copy, cut and paste

Select artwork and use Ctrl/Cmd+C, X or V, or open **More** / the canvas context menu. Copy transfers only the selected elements, their formatting, embedded images and complete nested groups. Pasted artwork gets independent element/group IDs and stays editable across pages and designs. Partial group selections detach from unselected ancestors. Cut requires the whole selection to be unlocked and removes it only after a successful clipboard write; undo restores it in one step.

The canvas accepts plain text and PNG/JPEG/WebP/GIF/AVIF clipboard files. Text fields and in-place text editing keep native copy/cut/paste. Pasted files retain their original bytes and dimensions; no image URL is fetched. Copy writes readable text plus an HTML representation carrying editable artwork. Browser clipboard support and permissions vary: if menu access fails, use native keyboard/browser paste. Editable artwork requires the HTML/custom representation to survive the clipboard transfer. There is no silent fallback to an old in-app clipboard.

On equal-sized pages, paste preserves source coordinates; same-page and repeated pastes offset by 24 pixels. Different canvas sizes center the copied artwork without scaling. A right-click Paste centers it at the chosen point. Placement and platform behavior still need direct reference/browser verification. Clipboard artwork is limited to 50 MB and plain text to 100,000 characters per paste. External rich-text styles, SVG/vector imports, page clipboard, style-only copying and copying rendered images to other applications remain unfinished. These are current implementation limits, not paid features.

## Crop images

Select an unlocked image and choose **Crop**, or double-click it. The side panel offers freeform, original and common aspect ratios, zoom, reset, Cancel and Done. Drag the image to reposition its contents; drag an edge/corner to trim or reveal the original while retaining any selected ratio. The crop handles and image position also support arrow keys, with Shift for larger steps.

Done, Enter or clicking outside finishes the crop in one undo step. Cancel or Escape discards the preview. Reset reveals the full embedded image, fitted inside the current frame bounds. Group membership, image opacity and rotation are retained. Crop operations store a source rectangle without re-encoding or replacing the embedded image; the existing upload size limit still applies. Reload, page/design copies, clipboard transfer, backups, presentation previews, SVG and raster/PDF exports retain the crop. Cropped clipboard selections use version 2; earlier uncropped selections still use version 1. Older app versions reject unsupported cropped transfers.

Crop zoom normally ranges from 100–1,000% of the full-source fit; an existing tighter crop keeps its larger zoom range while editing. Crop straightening/internal image rotation, stretching, automatic subject-aware cropping, shaped frames/grids and the separate photo editor remain gaps. The interface and exact crop interactions still need direct browser/reference verification.

## Text spacing

Select an unlocked text box and open **Spacing**. Letter spacing ranges from −200 to 800 (thousandths of the font size), and line spacing from 0.5 to 2.5. Use the sliders or number fields; adjustments preview on the canvas and commit on release, Enter or blur. Each completed adjustment is one undo step. Escape closes the panel and discards an unfinished adjustment. Invalid number entries leave the design unchanged.

**Anchor start**, **Anchor middle** and **Anchor end** keep the chosen vertical position fixed when the text reflows, including rotated text and width resizing. Corner resizing still keeps the opposite corner fixed. In-place editing previews the selected spacing, rotation and anchor while typing, then commits on blur/Escape. New text boxes and pasted plain text use 1.4 line spacing; existing designs and templates retain their authored spacing (legacy fallback 1.2).

Tracking and anchors survive local saves, duplicates, groups, backups and clipboard transfer. Backups with these fields use version 5 and clipboard selections use version 3; older formats remain supported for artwork without the new fields. SVG, presentation and supported Canvas exports use the same spacing inputs. PNG/JPG/PDF export requires a browser with Canvas letter-spacing support for tracked text; older browsers offer SVG instead of silently dropping tracking. No service or upload is added.

Paragraph-specific spacing, mixed text styles, kerning/ligature controls and precise font-baseline/bidi behavior remain gaps. The controls, touch gestures and rendered pixels still need direct browser/reference verification.

## Flip images

Select an unlocked image and choose **Flip → Flip horizontal** or **Flip vertical**. Each action toggles that direction in one undo step; repeat it to restore the previous orientation. The menu supports arrow keys, Home/End, Enter, Escape and Tab, and indicates the current flip directions. Text, native shapes and whole groups do not expose Flip; select an individual image inside a group to edit it.

Flips reflect the visible image around its frame center before rotation. They keep the original embedded bytes, crop window, size, position and group membership. Crop handles and panning follow the displayed image; crop reset retains flips. Local saves, page/design copies, clipboard transfer, backups, presentation previews and SVG/raster/PDF exports retain the orientation. Flipped backups use version 6 and clipboard selections version 4; older artwork can still use older formats. No uploads, service or paid gate is added.

The menu appearance, touch/focus behavior and exported pixels still require browser/reference verification. Video, editable vector illustrations and images inside shaped frames/grids are not yet implemented; this control does not substitute for those missing media features.

## Position and arrange elements

Select an element and open **Position** on the toolbar. **Arrange** contains layer ordering, page/selection alignment, and Advanced Width, Height, X, Y and Rotate fields. **Layers** selects elements and nested group members in stacking order. Position is also available in the canvas context menu, including when nothing is selected.

Enter or blur commits a numeric edit in one undo step. Escape cancels an unfinished field entry; another Escape closes the panel and returns focus. Arrow Up/Down adjusts a field by one, or ten with Shift. Invalid inputs leave artwork unchanged. Values display up to three decimals while the stored geometry keeps full precision. Coordinates use pixels; off-page positions are allowed. Single-element rotation is absolute, normalized to 0–360 degrees. Complete multi-selections use **Rotate by** for relative rotation about their current bounding center.

**Ratio** keeps single-element dimensions proportional. Multiple elements and groups scale uniformly, retaining layout and text proportions. Unlocked text width reflows around its selected text anchor; locked-ratio text resizing scales the font. Text height follows its content when Ratio is off. Line Height is read-only. Images retain source bytes, crop windows and flip flags; changing a frame's ratio uses the existing cover behavior. This does not implement stretching image pixels.

Alignment uses visible rotated bounds: one element or complete group aligns to the page, and multiple units align within their selection. **Space evenly** equalizes horizontal or vertical edge gaps between at least three units, retaining endpoints and group layout. Locked units stay fixed during alignment; numeric transforms and distribution require an entirely editable selection. Fields accept dimensions from 0.01 to 1,000,000 pixels and signed coordinates/rotation up to 1,000,000; existing multi-scale minimum sizes still apply.

All edits use the existing local save, undo, backup and export paths. Absolute group orientation, physical units, nonuniform multi-selection scaling, Tidy up and full layer management remain unfinished. Exact sizing pivots, mobile layout, keyboard/pointer interactions and rendered parity still need direct browser/reference verification.

## Layer navigation and ordering

Open **Position → Layers** to see the current page from front to back, with artwork previews, nested groups, lock indicators and the page background. Position is available for empty and locked selections too. **All** shows the page's layer tree; **Overlapping** shows the selected elements and frames that intersect them. It uses rotated frame geometry, not individual opaque image pixels.

Click a row to select its artwork, Shift-click to toggle multiple layers, or use the editor's existing touch selection mode. Expand **Group contents** to select individual members. Arrow keys/Home/End move keyboard focus between visible rows. The row's **More** menu and Shift+F10/right-click expose the same editor actions as the canvas, including copy, cut, duplicate, delete, grouping, locks and stacking. The background row selects the page and includes its color picker.

Drag a row with a mouse, or drag its move handle with touch, to an insertion marker. The list scrolls near its edges while dragging. On a move handle, Space/Enter starts a keyboard move; arrows/Home/End choose the insertion point, and Enter/Space commits. Escape cancels. Reordering commits once, keeping selected layers in their existing relative order. It changes only paint order; coordinates, source media, crop/flip metadata and nested groups remain intact. Undo, local reload, backups and exports use that order.

Moving layers must be unlocked siblings in the same group. A whole group moves as a block; a selected unlocked member can move within its parent. Cross-parent dragging does not silently regroup artwork. Cross-group reparenting, exact overlap semantics, touch long-press behavior, reference menu coverage and direct visual/browser comparison remain outstanding. Rename and visibility controls still need a direct reference audit before their behavior can be specified.

## Large guest design transfers

Guest sign-in copies structured design records directly and uses atomic destination revision checks. Content fingerprints are calculated in bounded chunks, preserving the existing copy IDs without building a whole-design or whole-library JSON string. This supports the previously failing eight-design, 50 MiB-source capacity fixture and a single design above the same string limit. Progress counts designs; long fingerprints yield so the page can remain responsive.

Retries preserve later edits to account copies. Changed source revisions or pending edits require another attempt, and failed writes leave the originals intact. Browser memory/storage still bounds the library: IndexedDB currently clones and writes the whole library. Native browser performance, sign-in completion and recovery UI remain unverified; corrupt raw-record recovery still has a separate JSON-string limit. [Evidence and remaining checks](docs/parity/2026-10-16/bounded-design-handoff.md).

## Guest upload recovery

Signing in waits for local imports and file actions in this tab before copying original images and thumbnails. Files copy one at a time with local receipts so an interrupted attempt can resume. The guest originals and existing account uploads remain intact. If an import fails, retry it or explicitly skip it; the sign-in recovery screen can download pending originals and saved files from either library. The guest cookie is acknowledged only after uploads and designs finish copying and the source upload revision is rechecked. No file bytes enter that request.

The Uploads database upgrades from version 1 to 2 while retaining its assets. Older app versions cannot open version 2; close old tabs and keep originals before downgrading. Copying requires enough local storage for both versions. This is a snapshot handoff, not continuous synchronization of other tabs' later edits. [Transfer behavior and verification limits](docs/parity/2026-10-15/guest-upload-handoff.md).
