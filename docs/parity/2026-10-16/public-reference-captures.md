# Public homepage and login reference capture

Date: 2026-10-16. PR [#53](https://github.com/tommy-muckstack/canvaisdead/pull/53), independently based on main after #48. **Original comparison is blocked by HTTP 403 human-verification challenges at both widths.** The live clone was observed successfully; no row is marked as a parity match.

## Completed native attempt

[Run 38925403162](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38925403162), job 117055534990, code `201ef4dd3fb2755ae5945263443bbdab8cf3f473`, tree `07e87f527a6f5b64c74375a7ba56176fc0af9965`. Clean install, lint, typecheck and production build pass. Chromium executes eight cases: **four clone observations pass; four original observations fail on HTTP 403**. No rerun or challenge bypass.

| Surface | Width | Original response / retained viewport | Clone response / retained viewport |
| --- | ---: | --- | --- |
| Homepage | 1440 | 403; [challenge screenshot](public-references/original-home-desktop.png) | 200; [homepage](public-references/clone-home-desktop.png) |
| Homepage | 390 | 403; [challenge screenshot](public-references/original-home-mobile.png) | 200; [homepage](public-references/clone-home-mobile.png) |
| Login | 1440 | 403; [challenge screenshot](public-references/original-login-desktop.png) | 200; [login](public-references/clone-login-desktop.png) |
| Login | 390 | 403; [challenge screenshot](public-references/original-login-mobile.png) | 200; [login](public-references/clone-login-mobile.png) |

Original requests remain at `https://www.canva.com/` and `https://www.canva.com/login`; the browser sees the access challenge, not the actual page or a locale redirect. The clone target is `https://canvaisdead.vercel.app/canvaisdead` and its `/login` route. Its deployed source commit is not inferred from this capture PR.

Ten exact PNGs were retained and inspected: the eight viewports above and full clone homepages at [1440 × 8042](public-references/clone-home-desktop-full.png) and [390 × 7862](public-references/clone-home-mobile-full.png). Login and challenge pages fit their viewports, so their redundant full-page captures are not stored again. [HTTP state, timestamps, visible copy, geometry/styles and accessibility snapshots](public-references/observations.json) preserve the observations without image data duplication.

## What the clone evidence establishes

- The initial login chooser visibly offers **Google and email only** at both widths, with the requested SaaS-themed backdrop and CanvaIsDead brand. The Google and email controls are 324 × 40px on desktop and 342 × 40px on mobile. This is a rendering observation, not successful authentication, signup or recovery.
- Homepage headline metrics are Jakarta 500 at 58px/64px on desktop and 34px/38px on mobile. These are now measured clone values; original font/spacing comparison remains unverified.
- The rendered homepage still contains blank decorative feature/template blocks and claims for unimplemented Magic tools. The main-source homepage navigation anchors and feature tabs remain incomplete. The mobile tab strip extends beyond the initial viewport (Print Shop starts at x=421); scrolling and keyboard reachability have not been exercised by this capture.
- Login Terms and Privacy links still point to `#`. The captures preserve the current layout but do not validate these destinations.

## Method and limits

Each case uses a fresh logged-out browser context at 1440 × 900 or 390 × 844. No account creation, form submission, consent clicks, SSO, payments, trials or real-person sharing. The workflow records the requested page's actual status, sanitized final URL, challenge state, visible copy, computed geometry/styles, accessibility and original PNG bytes. Navigation/challenge/error pages fail the check and never count as reference success.

The public-repository-only workflow uses pinned actions and read-only GitHub permissions, with no credentials, artifact/cache uploads or deployment steps. No product behavior, secrets or billing settings changed. The original challenge imagery is reference evidence under docs only, never an application asset.

Full-page captures are bounded to documents at most 20,000px tall; taller pages would be explicitly incomplete. Lazy-loading, every menu/hover/focus/animation state, cookie choices, email forms and logged-in flows still require further observations. A successful navigation or capture alone does not establish parity. The original needs a usable authorized browser session or manually supplied paired references before visual comparison can proceed; other clone functionality work remains available.
