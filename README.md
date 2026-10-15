# CanvaIsDead

Free, open-source Canva alternative. Part of the [IsDead series](https://yourappisdead.com). Served at `https://yourappisdead.com/canvaisdead`.

**Status: local only** (not pushed, not deployed). Surfaces follow `templates/marketing-site.md` in `@isdead/design`: one marketing page (`/`, price comparison at `#pricing`), `/login`, and the app at `/app`.

## What works
- Dashboard with search, 8 size presets, your designs (saved in the browser) and 8 original templates.
- Editor: shapes (rectangle, circle, triangle, star, line), text (heading/subheading/body, 5 fonts, size, bold/italic, alignment, in-place editing), image uploads, page color, layers panel, drag/resize/rotate with smart-guide snapping, arrow-key nudge, duplicate/delete, z-order, align-to-page, opacity, corner radius, border, undo/redo, canvas resize, zoom.
- Export PNG, JPG and SVG (no watermark). Autosave to localStorage per user.

## Known gaps
- Designs live in the browser (localStorage), not in the cloud; Firestore sync is next.
- No stock photo/video library, brand kits, collaboration, animation, PDF export or AI tools.
- Multi-select, grouping and crop are not implemented; resize handles ignore rotation for non-zero angles.

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
