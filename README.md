# CanvaIsDead

Free, open-source Canva alternative. Part of the [IsDead series](https://yourappisdead.com). Served at `https://yourappisdead.com/canvaisdead`.

**Status: work in progress.** See [the parity report](docs/PARITY_REPORT.md) for verified behavior, open PRs, and remaining gaps. Surfaces follow `templates/marketing-site.md` in `@isdead/design`: one marketing page (`/`, price comparison at `#pricing`), `/login`, and the app at `/app`.

## What works
- Dashboard with search, 8 size presets, your designs (saved in the browser) and 8 original templates.
- Editor: shapes (rectangle, circle, triangle, star, line), text (heading/subheading/body, 5 fonts, size, bold/italic, alignment, in-place editing), image uploads, page color, layers panel, drag/resize/rotate with smart-guide snapping, arrow-key nudge, duplicate/delete, z-order, align-to-page, opacity, corner radius, border, undo/redo, canvas resize, zoom.
- Export PNG, JPG, SVG and flattened RGB PDFs locally, with page selection, multi-image ZIPs, size/quality and transparency controls. No watermark. Autosave to localStorage per user.
- Multi-page designs: add, duplicate, title, delete and reorder pages; thumbnails and grid view; page operations in undo/redo. Existing single-page libraries still open. Resize affects every page; templates apply to the selected page.

## Known gaps
- Designs and uploaded media stay in the browser (localStorage). Hosted cloud sync is intentionally excluded under the local-only/no-new-cost requirement. Existing Firebase authentication and Vercel hosting are separate services; their account costs have not been verified.
- No stock photo/video library, brand kits, collaboration, animation, editable/vector PDF, PPTX/video/GIF export or AI tools.
- Multi-select, grouping and crop are not implemented. Rotated resize geometry now preserves the opposite anchor; visual and pointer behavior still need browser verification.
- Scrolling page view and selecting several pages together in the editor remain unfinished. Download page selection and presentation navigation are implemented; real-browser verification remains pending.

## Local backups
Use **Back up designs** in Home → Your designs or Projects to download a `.json` file containing the full library and embedded uploaded images. **Import backup** restores that file as new editable copies without replacing existing designs. Import validates the entire file before adding designs and accepts embedded raster images only; external image URLs are rejected. Backups larger than 50 MB are not supported yet.

New backups use version 2 to preserve every page. Version 1 backups remain importable; older app versions reject version 2 instead of silently importing only part of a design.

If browser storage is full or unavailable, edits stay in this tab and a recovery notice offers retry and a local backup download. Keep the tab open until saved or downloaded. Clearing browser data removes the saved library; keep backups somewhere safe on your device. No backup is uploaded to a server.

## Auth
Login and signup support only email/password and Google, with email password recovery. No Facebook, Apple, Microsoft, workplace SSO or alternative-provider choices. Shared Firebase project `yourappisdead`, helpers in `lib/isdead-auth` (vendored from `isdead-design/auth`). The session cookie `isdead_session` has path `/`, so one sign-in covers every IsDead app. Env: `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_SERVICE_ACCOUNT_JSON`. Without them, `/login` shows "Sign-in not configured". The single demo account ("Use the demo account") is available outside production or with `DEMO_MODE=1`.

## Develop
```
npm install
npm run dev        # http://localhost:3000/canvaisdead
npm test           # unit tests
npm run typecheck
npm run build && npm run shots   # product screenshots + end-to-end smoke test (Playwright)
```
Theme and font: `vendor/isdead-design` (OFL fonts, see `fonts/*/OFL-*.txt`). Not affiliated with Canva; all trademarks belong to their owners. Apache-2.0.

## Website analytics

Optional PostHog analytics uses a shared `website_*` taxonomy with `app_id=canvaisdead`. See [the analytics contract](docs/ANALYTICS.md) for production configuration, consent, event properties, privacy boundaries and rollout to other subapps. Design/media files remain local; consented usage metadata goes to the existing US PostHog project. No session replay or automatic DOM capture.

## Presenting local designs

Use **Notes** to save private notes for each page. **Present** starts at the selected page; the adjacent menu offers **Presenter view** (separate audience window) and **Autoplay**. Use arrows/space, tap/swipe or the page number to navigate. Escape returns to the editor. Presenter view shows notes, the next slide and elapsed time; the audience sees slide artwork only. Autoplay offers timing and looping.

Presentation reads saved designs from this browser. Save errors must be resolved before opening it. Live edits follow successful local saves and can be disabled. Audience synchronization works only between windows on the same origin/device; it is not public link sharing or cross-device remote control. Fullscreen and popups depend on browser support/permission. No server receives designs or media.

## Local downloads

**Share → Download** supports PNG, JPG, SVG, PDF Standard and PDF Print. Choose **All pages**, **This page**, or **Custom pages** (for example `1, 3-5`). Custom ranges are deduplicated and exported in document order. Multiple PNG/JPG/SVG pages form one ZIP; PDF pages form one PDF. Speaker notes are excluded. Downloads snapshot the document before rendering and can be cancelled without saving a partial file.

PNG/JPG/SVG support 0.5–4× dimensions; JPG supports quality control, and PNG/SVG support transparent page backgrounds. SVG text references fonts rather than embedding them. PDFs currently flatten artwork into RGB images at 96 DPI (Standard) or 300 DPI (Print), using a 96-pixel-per-inch page coordinate system. Physical-unit metadata, selectable/vector text, CMYK, bleed/crop marks, passwords, video/GIF and PPTX remain gaps, not paid features.

Optional download preferences stay in this browser, keyed by canvas dimensions; page selections are never saved. Uncheck **Save download settings** and download again to forget those preferences. Rendering is sequential; canvases above 8,192 pixels on either side or 32 million pixels total are rejected before allocation, and one output is limited to 256 MiB. These are current browser-memory limits, not plan tiers. Use smaller sizes, fewer pages or SVG when needed. All rendering and packaging happen locally.
