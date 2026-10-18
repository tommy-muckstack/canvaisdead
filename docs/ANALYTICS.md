# Analytics (PostHog)

One PostHog project (US cloud, project **666931**) collects the hub and every IsDead sub-app. The contract is the hub's
`yourappisdead/ANALYTICS.md`; this file is how CanvaIsDead follows it. Analytics is free for users and gates nothing.

## Setup
- `NEXT_PUBLIC_POSTHOG_KEY` = the project's publishable token (safe in the browser); `NEXT_PUBLIC_POSTHOG_HOST=https://us.posthog.com`. Both are set on the Vercel project. No key → analytics is a no-op and the privacy prompt is hidden.
- Reverse proxy through the app's own origin: `/canvaisdead/ingest/*` → `us.i.posthog.com` (rewrites in `next.config.mjs`, with `skipTrailingSlashRedirect: true`).
- `<Analytics />` is mounted once in `app/layout.tsx` (next to the `<WebsiteAnalytics />` consent prompt). It sends PostHog's built-in `$pageview` per route change. Autocapture, heatmaps, performance capture and session replay are off.
- posthog-js drops events from automated browsers. In dev, `localStorage.isdead_ph_debug = "1"` turns on verbose logs and lets automated browsers capture. Production keeps the bot filter.

## Consent (CanvaIsDead keeps its opt-in)
Nothing starts until the visitor picks **Allow analytics** in the privacy prompt. That means no PostHog script, cookie, id or event. **Essential only** (or withdrawing later) opts out and resets the PostHog id. Do Not Track and Global Privacy Control always win. The choice is stored under `isdead:website:analytics-consent:v1` (`lib/analytics/consent.ts`), so other IsDead apps on the origin could share it. The old `canvaisdead:cookies` flag doesn't count as consent. The prompt is hidden while presenting.

## Super properties (registered on every event)
| property | value | meaning |
| --- | --- | --- |
| `product` | `canvaisdead` | the one property to filter by (the hub sends `yourappisdead`) |
| `surface` | `landing` \| `app` | `landing` = home, pricing, login; `app` = everything under `/app` (library, projects, templates, editor, presentation) |
| `platform` | `web` | |
| `env` | `production` \| `development` | |
| `account_type` | `firebase` \| `guest` \| `demo` | registered after identification |

At boot the client unregisters older taxonomies' super properties (`suite_id`, `app_id`, `schema_version`, `environment`, `source`, `site_id`, `app`, …) from the shared cookie.

## Identity
Signed-in users are identified by their Firebase uid (`components/canva/AppShell.tsx`), which is what the hub contract requires. Before this change CanvaIsDead never identified anyone. Guests and the demo account are never identified; `account_type` is registered instead. Sign-out calls `reset()` and re-registers the super properties.

## Privacy rules
- `track()` rebuilds every event's properties from the allowlist in `lib/analytics/taxonomy.ts` (`safeProps`). Extra fields are dropped, and a value outside the list drops the whole event. Only fixed enums and booleans are sent. Never sent: design ids, names, artwork, uploads, file names, emails, search text or raw errors.
- URLs PostHog adds automatically (`$current_url`, `$pathname`, `$referrer`, initial URLs) become route patterns before sending (`lib/analytics/scrub.ts`): `/app/design/<id>` becomes `/app/design/:id`, and query strings and hashes are dropped. The page title is dropped as well.

## Events
| event | properties | trigger |
| --- | --- | --- |
| `$pageview` | | every route change after consent |
| `app_auth_started` / `app_auth_failed` | `method`: password \| google, `flow`: signin \| signup \| reset \| signin_or_signup | an auth request begins / rejects; the demo login isn't tracked |
| `app_signed_up` | `method`: password | email sign-up succeeded (sent with `trackNow` before the redirect) |
| `app_signed_in` | `method`: password \| google | sign-in succeeded (`trackNow`) |
| `app_password_reset_requested` | | reset email request accepted |
| `app_signed_out` | | sign-out form submitted |
| `app_design_created` | `origin`: blank \| template \| copy | new design stored |
| `app_design_renamed` / `_trashed` / `_restored` / `_deleted` | | library lifecycle, after the save |
| `app_design_starred` | `starred`, `origin`: library \| editor | star toggled, after an acknowledged save |
| `app_design_exported` / `app_design_export_failed` | `format`: png \| jpg \| svg \| pdf_standard \| pdf_print | download generated / failed (cancel is neither) |
| `app_template_applied` | | template applied to the selected page |
| `app_project_pages_applied` | `placement`: replace \| add, `selection`: single \| multiple | project pages reused in the editor |
| `app_backup_completed` / `app_backup_failed` | `action`: import \| download, `library`: designs \| uploads (optional) | design or upload backup import/download |

Renamed from the old `website_*` schema (2026-10): `website_page_viewed` → `$pageview`; `website_auth_completed` → `app_signed_up` / `app_signed_in` / `app_password_reset_requested`; `website_auth_*` → `app_auth_*` (`method: "email"` → `"password"`); `website_design_*` → `app_design_*`; `website_design_favorite_changed` (`action`) → `app_design_starred` (`starred`); `website_export_*` → `app_design_exported` / `app_design_export_failed`; `website_backup_*` → `app_backup_*`; `website_template_applied` / `website_project_pages_applied` → `app_*`. The event property `source` is now `origin`, because `source` is a legacy super property in the shared project. The hand-rolled Capture API client (`lib/analytics/{client,core,schema}.ts`, `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` / `NEXT_PUBLIC_POSTHOG_ENABLED`) is gone. Those env vars are no longer read.

Adding an event = add it to `EVENTS` and `ALLOWED` in `lib/analytics/taxonomy.ts` and to this table. `tests/unit/analytics.test.ts` covers naming, super properties, consent, the allowlist and URL scrubbing.

## Where the calls live
`lib/analytics/` (client, taxonomy, consent, scrub), `components/WebsiteAnalytics.tsx` (consent prompt), `components/LoginForm.tsx` + `CvLogin.tsx` (auth), `components/canva/AppShell.tsx` + `components/GuestDesignHandoff.tsx` (identify, sign-out), `components/canva/{Dashboard,DesignCreation,DesignGrid,EditorLoader,Editor,DownloadPanel,DesignFiles,UploadBackups}.tsx` (product events).

## Withdrawing consent
Choosing "no" (or withdrawing later) calls `opt_out_capturing()` and `reset()`. The opt-out is stored per PostHog token on the shared yourappisdead.com origin, so it also stops analytics in the hub and every other IsDead app in that browser. That is intentional: one "no" is honoured everywhere.
