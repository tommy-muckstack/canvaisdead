# CanvaIsDead

Free, open-source design editor. Part of the [IsDead series](https://yourappisdead.com). Served at `https://yourappisdead.com/canvaisdead`.

**Status: work in progress.** See [the parity report](docs/PARITY_REPORT.md) for verified behavior, open PRs, and remaining gaps. Surfaces follow `templates/marketing-site.md` in `@isdead/design`: one marketing page (`/`, price comparison at `#pricing`), `/login`, and the app at `/app`.

## What works
- Dashboard with search, 10 size presets, a Create a design picker, custom dimensions, your designs (saved in the browser) and original templates.
- Editor: shapes (rectangle, circle, triangle, star, line), text (heading/subheading/body, 5 fonts, size, bold/italic, alignment, in-place editing), image uploads, page color, layers panel, drag/resize/rotate with smart-guide snapping, arrow-key nudge, duplicate/delete, z-order, align-to-page, opacity, corner radius, border, undo/redo, canvas resize, zoom.
- Export PNG, JPG, SVG and flattened RGB PDFs locally, with page selection, multi-image ZIPs, size/quality and transparency controls. No watermark. Autosave to localStorage per user.
- Multi-page designs: add, duplicate, title, delete and reorder pages; thumbnails and grid view; page operations in undo/redo. Existing single-page libraries still open. Resize affects every page; templates apply to the selected page.
- Multiple elements: Shift-click, drag a selection box, Ctrl/Cmd+A, or use Select multiple for touch. Move/nudge, copy, delete, lock, align, change opacity and stacking, scale uniformly and rotate the selected objects together. Each completed pointer gesture is one undo step; Escape cancels it. Persistent groups support nested membership, individual member editing, grouping/ungrouping shortcuts and local backups.

## Known gaps
- Designs and uploaded media stay in the browser (localStorage). Hosted cloud sync is intentionally excluded under the local-only/no-new-cost requirement. Existing Firebase authentication and Vercel hosting are separate services; their account costs have not been verified.
- No stock photo/video library, brand kits, collaboration, animation, editable/vector PDF, PPTX/video/GIF export or AI tools.
- Image cropping, group selection, multiple-element operations and rotated geometry have unit coverage; visual and pointer behavior still need browser verification. Photo filters, image flipping, crop straightening, Smart Crop and background removal remain unfinished. Group outlines use axis-aligned bounds; exact rotation pivots and empty-space hit areas remain unfinished.
- Scrolling page view and selecting several pages together in the editor remain unfinished. Download page selection and presentation navigation are implemented; real-browser verification remains pending.

## Local backups
Use **Back up designs** in Home → Your designs or Projects to download a `.json` file containing the full library and embedded uploaded images. **Import backup** restores that file as new editable copies without replacing existing designs. Import validates the entire file before adding designs and accepts embedded raster images only; external image URLs are rejected. Backups larger than 50 MB are not supported yet.

Backups containing cropped images use version 4; other grouped backups use version 3, and ungrouped backups retain version 2. Versions 1–3 remain importable. Older app versions reject unsupported versions instead of silently importing content without its editing behavior.

If browser storage is full or unavailable, edits stay in this tab and a recovery notice offers retry and a local backup download. Keep the tab open until saved or downloaded. Clearing browser data removes the saved library; keep backups somewhere safe on your device. No backup is uploaded to a server.

## Create a design

Use **Create** in the rail to browse or search blank design sizes. **Custom size** in the homepage row opens width, height and units directly. Choose pixels, inches, millimeters or centimeters, lock the aspect ratio, swap orientation, or reuse a size from an active local design. Dimensions use 96 pixels per inch (the same coordinate system as PDF export) and round to whole pixels. Each side must be 40–8,000 pixels and the area must not exceed 25 million pixels.

The editor opens in the same tab after a successful local save. If that save fails, the dialog offers retry and a backup; retry opens the same design after saving it. Dedicated Docs, Sheets, video, website and other unavailable editors remain implementation gaps, with clear explanations in the picker and no paid gates. Static US Letter/A4 designs are available under Print. Physical-unit metadata and the reference's new-tab preference remain outstanding.

## Auth
Login and signup support only email/password and Google, with email password recovery. No Facebook, Apple, Microsoft, workplace SSO or alternative-provider choices. Shared Firebase project `yourappisdead`, helpers in `lib/isdead-auth` (vendored from `isdead-design/auth`). The session cookie `isdead_session` has path `/`, so one sign-in covers every IsDead app. Env: `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_SERVICE_ACCOUNT_JSON`. Without them, `/login` shows "Sign-in not configured". The single demo account ("Use the demo account") is available outside production or with `DEMO_MODE=1`.

Guests can enter `/app` without signing up when the existing guest-session configuration is enabled (production requires `AUTH_SECRET`; `GUESTS=0` disables it). Signing in copies guest designs into that account's storage **in the same browser**, retaining guest originals and preserving existing account designs. Unsaved guest edits are included when signing in through this tab. Failed copies keep the guest session available and offer retry and local backups; keep the tab open until unsaved edits are copied or downloaded. This does not sync designs across devices or continuously transfer edits from other tabs. See [the handoff protocol](lib/isdead-auth/README.md#canvaisdead-local-handoff).

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

Optional download preferences stay in this browser, keyed by canvas dimensions; page selections are never saved. Uncheck **Save download settings** and download again to forget those preferences. Rendering is sequential; canvases above 8,192 pixels on either side or 32 million pixels total are rejected before allocation, and one output is limited to 256 MiB. These are current browser-memory limits, not plan tiers. Use smaller sizes, fewer pages or SVG when needed. All rendering and packaging happen locally.

## Grouping elements

Select multiple elements and use **Group** on the floating toolbar, or press Ctrl/Cmd+G. Groups can contain other groups. Click a selected group again to select a member; drag, resize, rotate or edit its text while keeping membership. Use **Select parent group** or Escape to return to its parent. **Ungroup** or Ctrl/Cmd+Shift+G dissolves the selected group; on an individual member it removes that member from its immediate group. Layers exposes nested groups and individual members.

Groups move, align and reorder as units. A group containing a locked member stays fixed until unlocked; an explicitly selected unlocked member remains editable. Duplicates preserve nested membership with independent group IDs. Removing members collapses empty or one-child groups. Grouping separated layers gathers them at the frontmost selected layer. Membership, edits and undo use the same local browser store; artwork exports preserve appearance but do not carry editable group metadata. Nesting currently supports up to 32 levels.

## Copy, cut and paste

Select artwork and use Ctrl/Cmd+C, X or V, or open **More** / the canvas context menu. Copy transfers only the selected elements, their formatting, embedded images and complete nested groups. Pasted artwork gets independent element/group IDs and stays editable across pages and designs. Partial group selections detach from unselected ancestors. Cut requires the whole selection to be unlocked and removes it only after a successful clipboard write; undo restores it in one step.

The canvas accepts plain text and PNG/JPEG/WebP/GIF/AVIF clipboard files. Text fields and in-place text editing keep native copy/cut/paste. Pasted files use the existing local image conversion (up to 1,400 pixels on the longest side); no image URL is fetched. Copy writes readable text plus an HTML representation carrying editable artwork. Browser clipboard support and permissions vary: if menu access fails, use native keyboard/browser paste. Editable artwork requires the HTML/custom representation to survive the clipboard transfer. There is no silent fallback to an old in-app clipboard.

On equal-sized pages, paste preserves source coordinates; same-page and repeated pastes offset by 24 pixels. Different canvas sizes center the copied artwork without scaling. A right-click Paste centers it at the chosen point. Placement and platform behavior still need direct reference/browser verification. Clipboard artwork is limited to 50 MB and plain text to 100,000 characters per paste. External rich-text styles, SVG/vector imports, page clipboard, style-only copying and copying rendered images to other applications remain unfinished. These are current implementation limits, not paid features.

## Crop images

Select an unlocked image and choose **Crop**, or double-click it. The side panel offers freeform, original and common aspect ratios, zoom, reset, Cancel and Done. Drag the image to reposition its contents; drag an edge/corner to trim or reveal the original while retaining any selected ratio. The crop handles and image position also support arrow keys, with Shift for larger steps.

Done, Enter or clicking outside finishes the crop in one undo step. Cancel or Escape discards the preview. Reset reveals the full embedded image, fitted inside the current frame bounds. Group membership, image opacity and rotation are retained. Crop operations store a source rectangle without re-encoding or replacing the embedded image; the existing upload size limit still applies. Reload, page/design copies, clipboard transfer, backups, presentation previews, SVG and raster/PDF exports retain the crop. Cropped clipboard selections use version 2; earlier uncropped selections still use version 1. Older app versions reject unsupported cropped transfers.

Crop zoom normally ranges from 100–1,000% of the full-source fit; an existing tighter crop keeps its larger zoom range while editing. Crop straightening/internal image rotation, stretching, automatic subject-aware cropping, shaped frames/grids and the separate photo editor remain gaps. The interface and exact crop interactions still need direct browser/reference verification.
