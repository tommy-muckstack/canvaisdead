# CanvaIsDead

Free, open-source Canva alternative. Part of the [IsDead series](https://yourappisdead.com). Served at `https://yourappisdead.com/canvaisdead`.

**Status: work in progress.** See [the parity report](docs/PARITY_REPORT.md) for verified behavior, open PRs, and remaining gaps. Surfaces follow `templates/marketing-site.md` in `@isdead/design`: one marketing page (`/`, price comparison at `#pricing`), `/login`, and the app at `/app`.

## What works
- Dashboard with search, 8 size presets, your designs (saved in the browser) and 8 original templates.
- Editor: shapes (rectangle, circle, triangle, star, line), text (heading/subheading/body, 5 fonts, size, bold/italic, alignment, in-place editing), image uploads, page color, layers panel, drag/resize/rotate with smart-guide snapping, arrow-key nudge, duplicate/delete, z-order, align-to-page, opacity, corner radius, border, undo/redo, canvas resize, zoom.
- Export PNG, JPG and SVG (no watermark). Autosave to localStorage per user.
- Multi-page designs: add, duplicate, title, delete and reorder pages; thumbnails and grid view; page operations in undo/redo. Existing single-page libraries still open. Resize affects every page; templates apply to the selected page.

## Known gaps
- Designs and uploaded media stay in the browser (localStorage). Hosted cloud sync is intentionally excluded under the local-only/no-new-cost requirement. Existing Firebase authentication and Vercel hosting are separate services; their account costs have not been verified.
- No stock photo/video library, brand kits, collaboration, animation, PDF export or AI tools.
- Multi-select, grouping and crop are not implemented. Rotated resize geometry now preserves the opposite anchor; visual and pointer behavior still need browser verification.
- Download and Present currently use the selected page. Multi-page export, slideshow navigation, scrolling page view and selecting several pages together remain unfinished.

## Local backups
Use **Back up designs** in Home → Your designs or Projects to download a `.json` file containing the full library and embedded uploaded images. **Import backup** restores that file as new editable copies without replacing existing designs. Import validates the entire file before adding designs and accepts embedded raster images only; external image URLs are rejected. Backups larger than 50 MB are not supported yet.

New backups use version 2 to preserve every page. Version 1 backups remain importable; older app versions reject version 2 instead of silently importing only part of a design.

If browser storage is full or unavailable, edits stay in this tab and a recovery notice offers retry and a local backup download. Keep the tab open until saved or downloaded. Clearing browser data removes the saved library; keep backups somewhere safe on your device. No backup is uploaded to a server.

## Auth
Shared Firebase project `yourappisdead` (email/password + Google), helpers in `lib/isdead-auth` (vendored from `isdead-design/auth`). The session cookie `isdead_session` has path `/`, so one sign-in covers every IsDead app. Env: `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_SERVICE_ACCOUNT_JSON`. Without them, `/login` shows "Sign-in not configured". The single demo account ("Use the demo account") is available outside production or with `DEMO_MODE=1`.

## Develop
```
npm install
npm run dev        # http://localhost:3000/canvaisdead
npm test           # unit tests
npm run typecheck
npm run build && npm run shots   # product screenshots + end-to-end smoke test (Playwright)
```
Theme and font: `vendor/isdead-design` (OFL fonts, see `fonts/*/OFL-*.txt`). Not affiliated with Canva; all trademarks belong to their owners. Apache-2.0.
