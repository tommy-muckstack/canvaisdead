# CanvaIsDead

Free, open-source design editor. Part of the [IsDead series](https://yourappisdead.com). Served at `https://yourappisdead.com/canvaisdead`.

**Status: work in progress.** See [the parity report](docs/PARITY_REPORT.md) for this branch's changes and outstanding work. Surfaces are the homepage (`/`), `/login`, and the app at `/app`. Legacy `/pricing` links redirect home. All features are included for free; there are no trials, upgrades or paid plans.

## What works
- Dashboard with search, 8 size presets, your designs (saved in the browser) and 8 original templates.
- Editor: shapes (rectangle, circle, triangle, star, line), text (heading/subheading/body, 5 fonts, size, bold/italic, alignment, in-place editing), image uploads, page color, layers panel, drag/resize/rotate with smart-guide snapping, arrow-key nudge, duplicate/delete, z-order, align-to-page, opacity, corner radius, border, undo/redo, canvas resize, zoom.
- Export PNG, JPG and SVG (no watermark). Autosave to localStorage per user.

## Known gaps
- Designs and uploaded media remain in browser localStorage. Hosted cloud sync is excluded by the local-only requirement. Existing hosting and authentication account costs have not been verified.
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
Theme and font: `vendor/isdead-design` (OFL fonts, see `fonts/*/OFL-*.txt`). Independent project, not affiliated with or endorsed by any other design platform; third-party trademarks belong to their owners. Apache-2.0.
