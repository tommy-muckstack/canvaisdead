# IsDead website analytics contract

CanvaIsDead uses the existing PostHog **US project 666931** ([project](https://us.posthog.com/project/666931)). This integrates an existing account; it does not create a service, change billing, enable replay, or add paid product gates. Product functionality is free for users. Analytics event traffic counts toward the owner's PostHog allowance; account limits/billing have not been verified. The per-tab burst guard is not a spending cap.

## Configuration

Set these build-time variables for the CanvaIsDead production project only. Never commit their values or an environment file.

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | Existing project ingestion token supplied by the owner |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` |
| `NEXT_PUBLIC_POSTHOG_ENABLED` | `true` in production; unset or `false` elsewhere |

The ingestion token is browser-visible by design, not a personal/admin API key. Project ID is a dashboard reference, not capture authentication. The client additionally requires a production build on `yourappisdead.com` or `canvaisdead.vercel.app`. Local and preview hosts do not send events. Changing build-time variables requires a later build; this PR does not deploy anything. Vercel project verification currently returns 403 for the connected account; production variables are not confirmed.

## Shared taxonomy

All product events use `website_<object>_<past-tense-action>`. Do not add the app name to event names: distinguish apps using `app_id`. Every event includes these properties:

| Property | Contract |
| --- | --- |
| `suite_id` | `isdead` |
| `app_id` | `canvaisdead`; other apps use their stable lowercase slug |
| `platform` | `web` |
| `schema_version` | `1`; increment for incompatible changes |
| `environment` | `production` |
| `surface` | `marketing`, `auth`, `dashboard`, `projects`, `templates`, `editor`, `presentation`, `other` |
| `route` | Allowlisted route pattern; editor IDs become `/app/design/:id`, presentation IDs become `/app/design/:id/present`, unknown routes become `other` |

| Event | Additional properties | Trigger |
| --- | --- | --- |
| `website_page_viewed` | None | Initial page and client navigation after consent; repeated effect runs deduplicated |
| `website_auth_started` | `method`: `email`/`google`; `flow`: `signin`/`signup`/`reset`/`signin_or_signup` | Auth request begins; demo omitted |
| `website_auth_completed` | Same | Provider/session succeeds; `reset` means reset-link request accepted, not password changed |
| `website_auth_failed` | Same | Auth request rejects; no raw error content |
| `website_design_created` | `source`: `blank`/`template`/`copy` | New design stored locally; demo seeds omitted |
| `website_design_renamed` | None | Library title change saved locally |
| `website_design_trashed` | None | Design moved to local Trash |
| `website_design_restored` | None | Design restored from local Trash |
| `website_design_deleted` | None | Confirmed permanent deletion saved locally; automatic expiry omitted |
| `website_template_applied` | None | Template applied to the selected page |
| `website_export_completed` | `format`: `png`/`jpg`/`svg`/`pdf_standard`/`pdf_print` | Export blob generated and browser download triggered; does not prove disk write |
| `website_export_failed` | Same | Export rejects; user cancellation does not count as failure |
| `website_backup_completed` | `action`: `import`/`download`; optional `library`: `designs`/`uploads` | Backup import stored, or library backup download triggered |
| `website_backup_failed` | Same | Backup parsing/download fails |

Use the custom `website_page_viewed` event for views/funnels in Product Analytics. This deliberately does not emit a second `$pageview` or initialize the JavaScript SDK; built-in Web Analytics/session duration/retention features that require additional standard events are not claimed. Save-status recovery backup buttons are not instrumented. Do not emit events for individual keystrokes, drags, zoom changes or autosaves.

Design and Uploads backup controls now supply `library`; older callers/events without it remain valid under schema version 1. Upload restore emits completion only when its entire initial import queue succeeds; a partial storage failure emits failure. Later per-file retries do not emit another backup event. Cancellation emits neither outcome. No filenames, counts, image bytes, checksums or raw errors are attached.

## Data and consent

Designs, uploads, backups and exports stay on the user's device. Optional analytics is the explicit exception: the allowlisted usage metadata is sent to PostHog. No design IDs/names/content, uploaded data, file names, email, Firebase UID, search text, full URLs, query strings, hashes, referrers, raw errors or DOM content are included. No session replay, autocapture, identify calls or person profiles. GeoIP enrichment is disabled; PostHog necessarily receives the network request/IP, so this is not a claim that no network metadata reaches its infrastructure.

No events or identity are created until the visitor selects **Allow analytics**. Legacy `canvaisdead:cookies=1` is not treated as analytics consent. **Essential only** withdraws consent and deletes the stored random visitor ID. **Privacy choices** remains available in the editor and other non-presentation screens (prompts are hidden while presenting); Do Not Track and Global Privacy Control override consent. Old events already received by PostHog are not deleted by withdrawing consent.

Consent and a random anonymous UUID use `isdead:website:*:v1` local-storage keys shared by apps on the same origin. No identity is linked across domains or devices. Apps adopting these keys must present the same suite-wide choice and obey the same allowlist/privacy policy. If storage is blocked, a choice/ID lasts only in memory for the tab. Cross-tab changes are observed. Failure to write a denial still disables events in the current tab.

The [official Capture API](https://posthog.com/docs/api/capture#single-event) receives JSON via a direct, nonblocking POST with omitted cookies/referrer and `keepalive`. [Anonymous events](https://posthog.com/docs/data/anonymous-vs-identified-events#how-to-capture-identified-events) use `$process_person_profile: false`. Delivery is best effort, without an offline queue or retries. A per-tab cap of 60 events/minute protects against accidental bursts; dropped events are not replayed.

## Adding another app

Reuse `schema.ts` and `core.ts`; set a distinct `app_id`, correct base path and explicit production hostname allowlist in the client adapter. Extend route normalization for that app without exposing dynamic IDs. Use these shared events where semantics match; document additional events and fixed property enums before adding call sites. Keep common property names identical so one dashboard can filter/group by `app_id` and `surface`. Never pass arbitrary application objects to analytics.

## Validation

Unit tests cover consent, privacy signals, withdrawal under storage failure, cross-tab preference reads, schema filtering, sensitive route redaction, disabled/misconfigured clients, network failure and event caps. Browser network inspection, consent keyboard flows, actual PostHog receipt and production environment setup remain outstanding because this environment cannot launch its browsers or reach the deployment APIs. Do not interpret mocked transport tests as evidence of production ingestion.

Personal design favorites use `website_design_favorite_changed` after an acknowledged save, with `action=star|unstar` and `source=library|editor`. The existing consent gate, `app_id`, route normalization and property allowlist apply. Design IDs, names, artwork and favorite lists are not sent. Failed writes do not emit a success event; recovery retry currently does not replay it.
