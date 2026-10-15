# CanvaIsDead parity report

Updated: 2026-10-15. Baseline: `676b6686143e2481d1ffac3400e21a54e1046941`.

## Scope and completion rule

The latest product direction takes precedence over the initial free-tier brief:

- Logged-out scope: homepage and login/signup/password recovery. The additional phrase “the log” awaits clarification (logo or blog). A separate pricing page is out of scope.
- Authentication is limited to Google and email/password, including email password recovery. Facebook, Apple, Microsoft, workplace SSO and other identity providers are intentionally excluded by the owner’s 2026-10-15 clarification.
- Logged-in scope: **all Canva functionality, including paid functionality, offered free in the replica**. No subscriptions, trials, upgrade gates, or payment implementation.
- Designs, uploaded media and backups must remain local to the user’s device. Do not introduce billable storage, AI APIs or other paid services. Code/PRs are published to GitHub as requested; existing Vercel hosting and Firebase authentication remain external services whose account costs have not been verified.
- Optional PostHog website telemetry in the owner’s existing US project is explicitly authorized. Only consented allowlisted metadata leaves the device; design/media files remain local. No billing changes are authorized.
- Paid availability in Canva is not an exception. Brand Kit, AI tools, premium-equivalent assets, advanced export, and team features remain implementation work.
- Owner-supplied tombstone/X artwork replaces product icons and favicons in a teal/blue/purple gradient (2026-10-15 direction). This is an intentional branding difference. Original assets and open-license fonts replace Canva-owned assets. Preserve the existing independence disclaimer/footer. Never copy Canva templates, photos, fonts, or logos.
- Latest naming correction: no standalone original-company name in displayed product copy, including the footer. Preserve the independence disclaimer with generic third-party attribution; use CanvaIsDead for the product throughout.
- The owner initially requested review-only PRs, then explicitly authorized reviewing and merging acceptable open PRs into main on 2026-10-15. Each logical area still requires code checks and paired desktop/mobile evidence for a parity match. See the [integration review](parity/2026-10-15/merge-review.md); merging reviewed code does not establish visual parity.

`match` means observed and verified at both widths, including behavior; `differs` means a concrete difference has been found; `missing` means the capability is absent. `pending` is an interim audit marker for unobserved behavior, **not** a match or justified exception. No controlled comparison at both required widths has yet completed. The owner has now supplied one editor composite; see the reference notes below. This report is an initial inventory, not an exhaustive sign-off.

Severity: P0 = data loss/security; P1 = core functionality unavailable or misleading; P2 = significant UI/behavior/accessibility difference; P3 = minor visual detail. Severity for pending rows is provisional.

## Evidence and environment

- PRs #1–#4 triggered automatic Vercel previews. The owner requires local design/media storage and no new costs. `vercel.json` now disables Git-triggered deployments for `parity/**` branches; all other branches retain Vercel's default behavior. This prevents future parity preview builds, but cannot establish or remove charges from existing hosting/authentication or past deployments. See [Vercel's documented branch controls](https://vercel.com/docs/project-configuration/git-configuration). No billing settings or production environment variables were changed. The later PostHog change adds only an ignored local analytics configuration, disabled locally.
- Source retrieved through the GitHub connector because `git clone` fails DNS resolution, including after escalation. The local snapshot tree hash matches upstream (`c50d0e3717e862868253aea985dcefcee25bbd48`) and has an independent baseline commit; PRs must parent the real upstream commit through the connector, not push the synthetic history.
- No repository `AGENTS.md`, `CONTRIBUTING.md`, or `.env.example` exists at this baseline. No Firebase configuration was added or retrieved. The owner-provided PostHog ingestion token is stored only in ignored `.env.local` (analytics disabled locally), never in Git. Firebase account checks require the live deployment.
- `/workspace/isdead-shots/parity/canvaisdead/` is absent. Existing `public/home/*.png` are repository product assets, not newly captured parity evidence.
- Local DNS fails for GitHub, Canva, and npm. `npm ci --offline` also fails on uncached `retry-request@9.1.0`. Local typecheck/tests/build use the adjacent MiroIsDead installation; direct dependency versions for Next, React, Firebase, Firebase Admin, TypeScript, Vitest, Playwright, and types match this lockfile. PDF export additionally uses an isolated dependency overlay: lockfile-matching `pdf-lib@1.17.1` and its dependencies installed from cached npm tarballs, without modifying the adjacent installation. This is not a successful clean install. Firebase packages also warn that this host's Node version is below their required Node 24.12.
- Typecheck and baseline production build pass with that dependency fallback; baseline had 16 passing unit tests and no lint command. The current stack adds a pinned ESLint configuration and a working `npm run lint` with zero warnings. The lockfile was validated offline by npm using existing locked package metadata; local execution uses matching lint packages in an isolated overlay. A clean install remains unverified.
- The requested `NODE_OPTIONS=--unhandled-rejections=warn npm run dev` starts after escalation on port 3187. It emits file-watcher `EMFILE` warnings. Production serving succeeds locally.
- In-app browser execution is unavailable. Playwright Chromium fails during launch with macOS Mach-port permission errors; installed Chrome also exits during launch, including after escalation. A cached Firefox 1555 also aborts with SIGABRT both inside and outside the sandbox (rechecked 2026-10-15). No original or clone browser screenshot/computed-style measurement has been produced. Neither throwaway account has been created. No SSO, payment, trial, or real-person sharing was attempted.
- Owner-supplied editor comparison received 2026-10-15: [reference observations and limitations](parity/2026-10-15/editor-reference.md). It shows original on the left and clone on the right at different pane widths/zoom levels; it is not a paired viewport measurement.
- After the owner authorized review/merge, all 22 then-open PRs plus the review fixes in #24 were merged. Main at [`8f08536`](https://github.com/tommy-muckstack/canvaisdead/commit/8f085363c0e4643281b9645a4537e7f6b8441bc0) matched the tested integration source with zero file differences; GitHub confirmed all PRs merged. Vercel's commit status subsequently reported success. This establishes deployment status, not browser verification or completion of the parity audit. New work below starts from that source tree.
- [Canva homepage](https://www.canva.com/) is readable through web retrieval; that confirms page structure only, not layout or interaction. All paired captures are still required.
- [REA](https://github.com/morluto/rea), suggested by the owner, offers browser capture/comparison and JavaScript analysis. Its [browser workflow](https://github.com/morluto/rea/blob/main/docs/browser-observation.md) is relevant once a browser can run. It is not an editor component library. No REA code or proprietary original code has been imported.

Screenshot notation below: `blocked` = capture infrastructure unavailable, never evidence of a match. Expected evidence directory: `docs/parity/YYYY-MM-DD/`, with original/clone-before/clone-after names and viewport width. Keep authentication artifacts and account credentials outside the repository.

## Public surfaces

| Screen / feature | Status | Severity | Evidence / next verification | Screenshots |
| --- | --- | --- | --- | --- |
| Product mark / favicon / touch icon | differs | P2 | Owner-requested exception: supplied tombstone/X replaces product marks in teal/blue/purple, including homepage/login/shared branding, Projects, branded AI controls and favicon/touch metadata. Asset dimensions/transparency inspected; browser placement remains unverified. [Asset and prompt notes](parity/2026-10-15/tombstone-brand.md). | generated asset only; browser blocked |
| Homepage sections and copy | differs | P2 | `CvHome.tsx` contains AI/collaboration claims for unimplemented features and decorative template placeholders. | blocked |
| Homepage font metrics, gradients, spacing, illustrations | pending | P2 | Open-license Jakarta is present; measure against original at both widths. | blocked |
| Homepage navigation and mega-menus | missing | P2 | All `CvNav` navigation entries use `href="#"`; no mega-menu implementation. | blocked |
| Homepage feature tabs and carousel controls | missing | P2 | Static buttons without state/actions. | blocked |
| Homepage hover/focus/animation and reduced motion | pending | P2 | Browser and keyboard checks required. | blocked |
| Homepage footer | differs | P2 | Preserve disclaimer; links and download labels require functional audit. | blocked |
| Homepage cookie preferences | missing | P2 | Shared opt-in analytics controls now replace the fake login cookie banner when configured. Keyboard/viewport/network checks remain pending. | blocked |
| Login layout, backdrop, typography and mobile reflow | pending | P2 | `CvLogin.tsx`; no paired rendering yet. | blocked |
| Google sign-in logo/button | pending | P2 | Chooser now reuses the vendored official `GoogleButton`, matching the email form. Login CSS excludes it so Google font, spacing, colors, logo proportions and focus styles survive. Browser checks outstanding. | blocked |
| Email login, signup, forgot password | pending | P1 | Firebase handlers exist; production account flow untested. | blocked |
| Validation/error messages and focus | pending | P2 | `LoginForm.tsx` and auth helpers; compare actual invalid/expired/email-taken cases. | blocked |
| Other identity providers / workplace SSO | differs | P2 | Justified scope exception: owner requests only Google and email/password. Remove Facebook, alternative-method and work-email provider controls. Microsoft/Apple/SSO flows are not implemented or planned. Ordinary work email addresses can use email/password. | blocked |
| Cookie consent dialog | differs | P2 | Essential-only and analytics choices control real event delivery; DNT/GPC override consent. This owner-requested telemetry differs intentionally; browser verification remains pending. | blocked |
| Guest sessions and local account handoff | differs | P1 | Integrate upstream #18 guest entry with local design copying after verified sign-in. Preserve guest originals, saved/unsaved versions and existing account designs; support retry, backups, confirmation timeout and reload recovery. Add dashboard/editor Sign in actions. No server-document adoption. Real Google/email completion, multi-tab coordination and cross-subapp guest recovery remain unverified/incomplete. [Protocol](../lib/isdead-auth/README.md#canvaisdead-local-handoff). | blocked |
| Onboarding questions | missing | P2 | Signup routes directly into app; no onboarding flow found. | blocked |
| Logo/blog scope clarification | pending | P2 | Owner said “the log”; clarification requested. | blocked |

## Dashboard and library

| Screen / feature | Status | Severity | Evidence / next verification | Screenshots |
| --- | --- | --- | --- | --- |
| Main rail and collapse behavior | differs | P2 | `AppShell.tsx`: collapse button inert; several destinations route to Home. | blocked |
| Home hero and visual hierarchy | pending | P2 | Compare typography, gradient, spacing and responsive states. | blocked |
| Trial messaging | differs | P1 | Intentional scope difference: Home, Templates, Projects and editor now say “Everything included,” with no trial/upgrade action. No features are gated. Browser evidence still pending. | blocked |
| Search designs and templates | differs | P1 | Home filters; Templates page still renders fixed discovery/trending lists. | blocked |
| Quick-create row | differs | P1 | Custom size, Social media, Print and More open the shared picker; Presentation retains direct blank creation. Other categories now explain unavailable editors instead of doing nothing or creating unrelated artwork. Those editors remain required work. | blocked |
| Template strips and category tiles | differs | P2 | Original generated art exists; category placeholders and inert “See all” remain. | blocked |
| Create design menu / dimensions / units | differs | P1 | Shared searchable picker on Home/Projects/Templates, px/in/mm/cm inputs, ratio lock, swap, validation and real local recent sizes implemented. Save before navigation; failed writes retain one design for retry/backup. 96 px/in conversion rounds to whole pixels. Exact layout, unit conventions, preset coverage and new-tab preferences remain unverified/incomplete. [Comparison notes](parity/2026-10-15/create-design.md). | blocked |
| Projects listing and All projects empty state | differs | P1 | Active and Trash views now have search, accessible card menus and mobile navigation. Local-only data; other sidebar/filter/folder controls remain incomplete. | blocked |
| Project folders and starred | missing | P1 | No folder/star data model or actions. | blocked |
| Trash and restore | differs | P1 | Local Trash, restore, Undo, confirmed permanent deletion and Empty Trash implemented. Thirty-day retention uses the device clock and cleans up while the library is open; no server recovery after permanent deletion. Multi-select, shared ownership and browser verification remain outstanding. [Comparison notes](parity/2026-10-15/library-actions.md). | blocked |
| Profile/account/workspace menu | differs | P2 | Guests now have a visible Sign in action. Account avatar still submits logout immediately; full profile/workspace menu is absent. | blocked |
| Brand dashboard | missing | P1 | Rail entry goes Home. | blocked |
| Apps dashboard | missing | P1 | No Apps route. | blocked |
| Notifications and Help | missing | P2 | Inert controls. | blocked |
| Search/loading/empty/error states | differs | P2 | Some empty states present; initial local loading and failures need explicit treatment. | blocked |

## Editor chrome, panels and object operations

| Screen / feature | Status | Severity | Evidence / next verification | Screenshots |
| --- | --- | --- | --- | --- |
| Gradient top bar / responsive layout | pending | P2 | Compact local-save icon, responsive header and panel-relative toolbar positioning implemented. Browser measurement at 1440 and 390 remains pending. | blocked |
| File menu | missing | P1 | Button has no action. | blocked |
| Resize | differs | P1 | Presets work in source; no custom size, copy-and-resize or responsive reflow. Free access must remain. | blocked |
| Editing mode selector | missing | P2 | Button has no action. | blocked |
| Undo/redo | pending | P1 | Immutable history has unit coverage; real interaction parity unverified. | blocked |
| Editor rail | differs | P1 | AI, Tools, Projects and Apps buttons inert; Brand opens background color. | blocked |
| Design/Templates panel | differs | P1 | Search filters name/category; matching canvas proportions are prioritized. Dense borderless previews replace padded/captioned cards. Original art remains; actual visual/interaction checks pending. | blocked |
| Elements panel/search/categories | differs | P1 | Five shapes work; category buttons/search do nothing. | blocked |
| Text panel presets | differs | P2 | Heading/subheading/body add text; search, Magic Write and brand-font controls inert. | blocked |
| Uploads panel | differs | P1 | Single raster upload only, no asset library or drag/drop. | blocked |
| Brand Kit panel | missing | P1 | No actual kit/font/logo/color persistence. | blocked |
| Tools / Projects / Apps panels | missing | P1 | No panel implementations. | blocked |
| Canvas zoom/pan | differs | P2 | Relative zoom exists; canvas fit now reads actual responsive padding. No pan control; fit/zoom need browser checks. | blocked |
| Selection handles / rotation handle | pending | P2 | Circle corners, bar edges, rotation handle below exist; verify sizes and interaction. | blocked |
| Rotation-aware resize | pending | P1 | Pointer deltas now use local axes and preserve the opposite anchor at every angle. Corner ratio clamps and text scaling/reflow have geometry coverage. Actual pointer/render behavior and comparison with Canva remain outstanding. | blocked |
| Floating toolbar appearance | pending | P2 | Compare position, sizing, icons and focus behavior. | blocked |
| Ask CanvaIsDead / element links / comments | missing | P1 | Toolbar displays unsupported toasts. | blocked |
| Lock persistence and protection | pending | P1 | Locks now use saved element state and history. Element edits/deletes/reordering are guarded; locked objects remain selectable for unlocking; edit/resize controls are hidden. Unit regression coverage passes; browser flow still blocked. | blocked |
| More menu / duplication / z-order | differs | P2 | Basic actions exist; inspect full menu and keyboard behavior. | blocked |
| Position panel / alignment | differs | P2 | Basic page alignment and two stacking controls only. | blocked |
| Layers panel | differs | P2 | Simple list inside Elements; no dedicated full layer management. | blocked |
| Guides and snapping | pending | P2 | Geometry unit tests pass; compare drag thresholds, zoom, rotation and multi-object behavior. | blocked |
| Multi-select / grouping / ungrouping | missing | P1 | Selection model is one element ID; no groups. | blocked |
| Copy / cut / paste | missing | P1 | No clipboard integration. | blocked |
| Keyboard shortcuts | differs | P2 | Undo/redo/duplicate/delete/nudge/Esc, Ctrl/Cmd+Enter to add a page and Ctrl/Cmd+D to duplicate a page when no element is selected. Page thumbnails support arrows/Home/End. Formatting, selection, page clipboard and other tool shortcuts remain absent. | blocked |
| Context menu | missing | P2 | No editor-specific context-menu implementation. | blocked |
| Page background color | pending | P2 | Palette/custom color exist; compare interaction and exported result. | blocked |
| Add/delete/reorder/duplicate pages | pending | P1 | Page model, titles, creation/duplication/deletion, move controls and desktop drag reorder implemented with document history and local persistence. Retain one page; cap new pages at 350. Default blank-page background and exact selection behavior need original verification. | blocked |
| Page strip and grid view | differs | P1 | Real thumbnails, page counts, selection and grid view implemented; enlarged centered thumbnails now have an adjacent Add page control. Scrolling canvas view, multi-page selection, page clipboard and native touch dragging remain absent. Move buttons provide a touch/keyboard alternative to dragging. | blocked |
| Notes / Timer / bottom bar | differs | P2 | Private per-page notes now persist, support undo/redo and backup, and appear in Presenter view. Editor Timer remains a static label; the presenter has an elapsed timer. | blocked |

## Text editing

| Screen / feature | Status | Severity | Evidence / next verification | Screenshots |
| --- | --- | --- | --- | --- |
| Font picker / font size / colors | differs | P2 | Five fonts, simple native select and stepper; no full font browsing/upload. | blocked |
| Bold / italic | pending | P2 | Existing toggles; raster italic font restoration fixed with decoration work. | blocked |
| Underline / strikethrough | pending | P1 | Implemented in this change: independent toggles, pressed state, editing style, persistence/history and SVG/PNG/JPG output. Unit tests pass; browser parity outstanding. | blocked |
| Case change / alignment | pending | P2 | Existing whole-element controls; selection-level behavior unverified. | blocked |
| Lists | missing | P1 | Unsupported toast. | blocked |
| Letter / line / paragraph spacing | missing | P1 | Unsupported toast; model has lineHeight but no UI. | blocked |
| Text Effects | missing | P1 | Unsupported toast. | blocked |
| Text/object Animate | missing | P1 | Unsupported toast. | blocked |
| Rich text / mixed formatting | missing | P1 | One style per text element; textarea editing. | blocked |
| Double-click / Enter / Esc / selection editing | differs | P1 | Double-click/Esc path exists; Enter-to-edit absent; input behavior needs original comparison. | blocked |
| Text wrapping, italic measurement and long words | differs | P1 | Preserve spaces/blank lines, wrap oversized words at grapheme boundaries, and measure italic text correctly in SVG/canvas/selection geometry. Tabs, locale-specific break rules, shaping across breaks and trailing-space alignment still need work/verification. | blocked |
| Font loading and layout refresh | differs | P2 | Editor SVG layout is memoized by design only; late font loading does not trigger remeasurement. Downloads now load fonts used by every selected page, and presentation previews refresh after font loading. Editor font swaps still require a subscription and browser verification. | blocked |

## Sharing, export and persistence

| Screen / feature | Status | Severity | Evidence / next verification | Screenshots |
| --- | --- | --- | --- | --- |
| Share menu layout and keyboard behavior | pending | P2 | UI present; many actions below are placeholders. | blocked |
| Access control / invitations / collaboration | missing | P1 | Static people/access controls; no sharing model or collaboration transport. | blocked |
| Public view link / copy link | differs | P1 | Copies local editor URL although designs exist only in this browser. | blocked |
| Download PNG/JPG/SVG | differs | P1 | Local snapshot export, real font preparation, size/JPG quality and background controls implemented. Multiple selected pages produce a ZIP. SVG fonts are referenced, not embedded; browser output and original comparison remain pending. | blocked |
| PDF export | differs | P1 | Multi-page flattened RGB Standard (96 DPI) and Print (300 DPI) PDFs implemented. Page sizes currently assume 96 pixels/inch; physical-unit metadata, vector/selectable text, CMYK, crop/bleed, accessibility and password options remain gaps. | blocked |
| PPTX / video / GIF export | missing | P1 | Download selector explicitly labels these formats unavailable; implementation remains required without paid gates. | blocked |
| Export pages / size / quality / transparency | differs | P1 | All/This page/Custom ranges, 0.5–4× image/SVG size, JPG quality, PNG/SVG transparency, local preferences, progress/cancel and explicit failures implemented. Selected pages keep document order and omit private notes. Native page previews/checkboxes, estimated file size, compression choices and broader size limits remain gaps. | blocked |
| Present mode and presenter view | differs | P1 | Full-screen/windowed slides, keyboard/touch navigation, go-to-page, autoplay, loop, elapsed presenter timer, notes/next-page preview, audience window sync and optional live saved edits implemented. Actual fullscreen/popups/rendering remain unverified. Remote control, draw tools, effects, music timers and recording remain gaps. | blocked |
| Present and record | missing | P1 | Inert Share action. | blocked |
| Publish as website / link settings | missing | P1 | Inert Share action. | blocked |
| Google Drive / third-party export | missing | P1 | Inert Share action. | blocked |
| Autosave and save-state reporting | pending | P0 | Local-only writes now report errors, retain unsaved edits, allow retry and download a JSON recovery backup. Failed reads never replace existing data. Creation waits for a successful write before navigation. Browser checks outstanding. | blocked |
| Local recovery backups | pending | P1 | Home and Projects offer full-library JSON downloads and import as new editable copies. Version 2 preserves every page; version 1 remains importable. Validate every page, including embedded images, text styles and locks; malformed files, unsupported versions and remote images are rejected. Browser checks outstanding. | blocked |
| Simultaneous editing across tabs | differs | P1 | A changed stored library is detected before writing, preserving this tab’s edits for backup. No automatic merging or transactional multi-tab synchronization. | blocked |
| Cloud sync / cross-device reopen | differs | P1 | Intentional exception to hosted synchronization: owner requires local-only design/media storage and no new costs. Do not wire up the unused generic Firestore store. Portable local backup/restore is implemented as the alternative; browser verification remains outstanding. | blocked |
| Rename design | pending | P2 | Editor input and library inline title editing update the local model. Library supports Enter/Save, Escape/Cancel and empty-title validation. Browser persistence/focus checks remain outstanding. | blocked |
| Delete design | differs | P1 | Card menu moves designs to local Trash with Undo/restore. Permanent deletion uses an accessible confirmation dialog and protects active/restored versions. Trashed designs cannot open in editor/presentation. Bulk selection and browser comparison remain pending. | blocked |
| Duplicate design | differs | P1 | Home/Projects Make a copy preserves all pages, notes, media and locks under new design/page IDs. Unit tests verify isolation; editor File-menu duplication and browser verification remain outstanding. | blocked |
| Template application | pending | P1 | Applies only to the selected page, adapting the template to document dimensions and preserving other pages. Verify resizing behavior, naming and history against the original. | blocked |

## Paid functionality to implement free

These are backlog items, not exceptions. Inventory must expand with actual logged-in observation; the list below does not claim complete coverage of Canva's current paid offering.

| Screen / feature | Status | Severity | Evidence / next verification | Screenshots |
| --- | --- | --- | --- | --- |
| Brand kits, brand fonts/logos/templates, brand controls | missing | P1 | Build own persisted implementation and licensed-font uploads. | blocked |
| Premium-equivalent template/element/media library | differs | P1 | Small original template set only; expand original/open-license catalog and filtering. | blocked |
| Background removal / photo editing / crop / filters | missing | P1 | Use free local/open implementations where practical; no service selected. | blocked |
| AI writing, generation, image editing and translation | missing | P1 | Use local models or a genuinely cost-free architecture; paid hosted APIs are disallowed. Not waived for being paid in Canva. | blocked |
| Magic Resize / design adaptation / animation | differs | P1 | Basic geometric resize only; full adaptation and animation absent. | blocked |
| Video/audio editing and timeline | missing | P1 | Static design model only. | blocked |
| Docs / Sheets / Whiteboards / Websites / Email | missing | P1 | Dashboard labels do not provide those editors. | blocked |
| Content planner / scheduling / publishing integrations | missing | P1 | No planner, scheduler or provider integrations. | blocked |
| Teams / comments / approvals / version history | missing | P1 | No workspace, roles, collaboration or approval model. | blocked |
| Advanced export / reusable assets / bulk creation | missing | P1 | Requires data-model and renderer work. | blocked |
| Enterprise admin / provisioning / audit features | missing | P1 | Admin/audit functionality remains in scope; workplace SSO and other identity providers are explicitly excluded. Infrastructure requirements need specification. | blocked |

## Global quality

| Screen / feature | Status | Severity | Evidence / next verification | Screenshots |
| --- | --- | --- | --- | --- |
| 404 state | differs | P2 | Framework default; no app-specific not-found route. | blocked |
| Error boundaries / recovery | missing | P1 | No `error.tsx`; design-storage read/write failures now have explicit recovery notices. | blocked |
| Loading states | differs | P2 | Dashboard and EditorLoader now wait for local reads; loading remains plain text with aria-busy. | blocked |
| Keyboard navigation / dialogs / focus return / contrast | pending | P1 | Requires real browser/a11y checks at both viewports. | blocked |
| Responsive logged-in layout / touch | differs | P1 | Editor panel now overlays rather than consumes canvas width on narrow screens and starts closed; header/popovers and fit padding adapt. Actual mobile and touch verification is still required; dashboard responsiveness remains unaudited. | blocked |
| Lint and repeatable browser checks | differs | P1 | Repository-wide `npm run lint` now passes with pinned ESLint/TypeScript/hooks configuration and zero warnings. Existing findings are fixed; generated/vendor UI files are excluded. `npm run test:e2e` runs the two-viewport suite, but browser launch remains blocked here. Legacy shots script still needs selector/output-path maintenance. | blocked |

## Change log

Parity PR inventory: [#1 text decorations](https://github.com/tommy-muckstack/canvaisdead/pull/1), [#2 official Google button](https://github.com/tommy-muckstack/canvaisdead/pull/2), [#3 free messaging](https://github.com/tommy-muckstack/canvaisdead/pull/3), [#4 persistent locks](https://github.com/tommy-muckstack/canvaisdead/pull/4), [#5 skip parity previews](https://github.com/tommy-muckstack/canvaisdead/pull/5), [#6 reliable local saves](https://github.com/tommy-muckstack/canvaisdead/pull/6), [#7 local backup/restore](https://github.com/tommy-muckstack/canvaisdead/pull/7), [#8 rotated resizing](https://github.com/tommy-muckstack/canvaisdead/pull/8), [#9 text layout](https://github.com/tommy-muckstack/canvaisdead/pull/9), [#10 multi-page designs](https://github.com/tommy-muckstack/canvaisdead/pull/10). [#11 Google/email login and original backdrop](https://github.com/tommy-muckstack/canvaisdead/pull/11). [#12 all-included branding](https://github.com/tommy-muckstack/canvaisdead/pull/12). [#13 website analytics](https://github.com/tommy-muckstack/canvaisdead/pull/13). [#14 base-path redirect fix](https://github.com/tommy-muckstack/canvaisdead/pull/14). [#15 editor refinements](https://github.com/tommy-muckstack/canvaisdead/pull/15). [#16 local presentations](https://github.com/tommy-muckstack/canvaisdead/pull/16). [#17 local downloads](https://github.com/tommy-muckstack/canvaisdead/pull/17). [#19 tombstone branding](https://github.com/tommy-muckstack/canvaisdead/pull/19). [#20 repeatable lint](https://github.com/tommy-muckstack/canvaisdead/pull/20). [#21 direct-to-main free copy correction](https://github.com/tommy-muckstack/canvaisdead/pull/21). [#22 local guest recovery](https://github.com/tommy-muckstack/canvaisdead/pull/22). The PRs were created as drafts, mostly stacked; #21 was independently based on main. The owner subsequently authorized review and merging acceptable open PRs. Current review findings and integration details are in the [merge review](parity/2026-10-15/merge-review.md). The guest handoff change integrates independently merged upstream [#18 guest sessions](https://github.com/tommy-muckstack/canvaisdead/pull/18) from main at `eac12c93c2c90d993fe8e02bb08a9c417ca1e997`.

### Integration review and session input validation

- Review all 22 open PRs and their combined runtime changes, dependency overlap, checks and review threads. Preserve the independently based #21 wording changes while integrating the stack with the already merged #18 guest-session changes.
- Reproduce two malformed-input failures with regression tests before fixing them: a JSON `null` login payload threw during destructuring, and a non-ASCII demo-cookie signature threw during constant-time comparison. Reject malformed session bodies with 400 and invalid demo signatures with no identity. No credentials or authentication provider policy changed.
- Re-run the full check sequence on the integration candidate. Detailed outcomes, per-PR review areas and remaining verification limits are recorded in [merge-review.md](parity/2026-10-15/merge-review.md). The owner authorized merging reviewed PRs; browser-based visual parity and real Firebase completion remain unverified.

### Create a design and custom dimensions

- Compare the documented Create search and custom-dimension workflow against the inert rail entry and Custom size's hardcoded logo preset. Add a shared native dialog to the rail, homepage row and Projects empty state, with category browsing, preset/name/dimension search, blank creation and explicit availability for absent editor types.
- Add pixel/physical-unit inputs, exact-boundary validation, aspect-ratio locking, orientation swap and deduplicated recent sizes from active local designs. Use the existing PDF coordinate system (96 px/in) with whole-pixel rounding. Physical-unit metadata, exact reference conversion behavior, new-tab preferences and the full design-type catalog remain gaps.
- Save to the existing browser store before navigation. Prevent duplicate submissions; failed saves retain the same design for retry/backup, while read errors and cross-tab conflicts prevent creation. No design upload, new service, authentication or environment change.
- Lint, typecheck, 195 unit tests and production build pass using the documented dependency overlay. Local production HTTP checks confirm the Create dialog button renders on Home/Projects/Templates and existing guest/public routes still respond. Playwright discovers 38 cases, including eight new desktop/mobile picker cases; browser execution, screenshots and computed-style comparison remain blocked. See [create-design.md](parity/2026-10-15/create-design.md); no match claim.

### Local library rename, copy and Trash

- Compared the reference's documented title editing, thumbnail Make a copy menu, Trash/restore and 30-day retention with the existing permanent-delete card button. Reuse one card/action implementation across Home and Projects; add inline rename, full-document copies, search in Projects/Trash, mobile view links, Undo, restore, individual permanent deletion and Empty Trash.
- Preserve all page content, embedded media, notes and locks. Make copies independent without replacing originals. Store Trash metadata in the same browser library; refuse ambiguous duplicate design IDs or invalid timestamps. Backups retain Trash data, but importing intentionally creates active recovered copies.
- Enforce the retention window using the device clock on library open and once a minute while mounted. No server jobs, uploads or paid service. After permanent deletion, recovery requires a previously downloaded backup; the reference's server support recovery window is unavailable with device-only storage. Clearing browser data can also remove the library.
- Guard editor autosaves and presentation reads against trashed designs. Confirm destructive actions against the exact trashed versions shown, preserving subsequently restored/retrashed versions. Reuse local storage conflict, quota, retry and backup handling; disable further card mutations while a save needs recovery.
- Allowlist lifecycle analytics without design names/IDs/content. Existing consent and delivery settings are unchanged; no token/environment changes.
- Validation: lint, typecheck, 169 unit tests and build pass. Production HTTP checks verify Projects/Trash routing (200); Playwright discovers 30 cases. See [comparison and verification notes](parity/2026-10-15/library-actions.md). Paired screenshots and browser interaction verification remain blocked; no match claim. Folders, starring, shared content, multi-selection and editor File-menu actions remain separate work.

### Guest sign-in with local design recovery

- Integrate main's guest entry and existing project-link metadata. Replace its server document-adoption path with a browser-local copy after Firebase verification; preserve the 204 auth response and expose only verified, URI-encoded identity metadata. No design/media contents enter auth requests or analytics.
- Retain the guest cookie until the local write and a verified account/guest acknowledgment succeed. Resume recovery after reload while that cookie remains. Bound confirmation requests to 15 seconds and show retry/backup actions for storage, network, corrupt data or account-change errors. Keep unsaved edits in browser memory and warn before leaving.
- Copy all pages, notes, embedded media and text properties, keeping guest originals and existing account libraries. Stable content-derived copy IDs prevent duplicate retries and preserve later edits to account copies. Keep saved and unsaved guest versions when they differ; return to the copied editor design.
- Add Sign in links to the active dashboard and editor, with room for the editor link on mobile. Focus the recovery heading and keep keyboard-operable backup/retry controls. Guard server pages while the layout creates the guest session; production HTTP checks previously exposed a null-user exception during that redirect.
- Carry the latest #21 naming correction into the footer/configuration while retaining the requested independence statement. The inherited all-included messaging, Google/email-only UI and tombstone mark remain in place.
- Compared the already merged #18 session/adoption code with this editor's browser-storage model and the owner's local-file requirement. This is behavior/source evidence, not an original-app visual comparison.
- Validation: lint, typecheck, 157 unit tests and production build pass. Tests cover full document preservation, ID collisions, canonical/idempotent retries, corrupt data, quota/denied access, changed saved/unsaved versions, account-change acknowledgment and network timeout. Local production HTTP checks confirm guest entry (307), five guest routes (200), login access, guest acknowledgment rejection (401) and unconfigured Firebase response (503). The null-user error no longer appears in the checked server output.
- Playwright discovers 24 cases at 1440 × 900 and 390 × 844, including guest entry, local saves and both sign-in links. Browser runtime remains unavailable; no paired screenshots, real Firebase signup/login or browser handoff success is claimed.
- Limits: copying needs room for both libraries, so quota failures require backups/free storage and retry. This is a snapshot transfer, not transactional multi-tab synchronization or cloud sync. Other tabs' ongoing edits and shared guest-cookie recovery across other subapps remain follow-up work. A different app clearing the shared guest cookie before CanvaIsDead observes it prevents automatic handoff here; source browser data is not deleted.

### Repeatable repository lint and check commands

- Add a pinned ESLint 9 flat configuration for JS/TypeScript and React hook ordering/dependencies; `npm run lint` treats warnings as failures. Include application code, auth helpers, tests and scripts; exclude generated output and vendored UI code. Add `npm run test:e2e` as the existing Playwright suite entry point.
- Resolve baseline unused logout parameter, unknown auth-error types, decoded-token typing, misleading hook-style predicate naming and empty screenshot-helper catch blocks. No credential values, authentication policy, storage behavior or runtime package resolutions change.
- Add development-only locked packages. Npm validates the lockfile offline; comparison confirms every pre-existing package version/source/integrity is unchanged. Local tooling still uses the documented isolated dependency overlay; do not infer a successful clean install.
- Validation: repository-wide lint reports zero warnings/errors; a deliberate invalid-hook/unused-variable input is rejected. Typecheck, 124 unit tests and production build pass. No new UI behavior or screenshots for this tooling-only change; browser parity and the legacy screenshot script remain outstanding.
- External-state finding: upstream #18 guest sessions was merged separately during this work. Its server adoption path does not read browser design storage, and the active AppShell has no guest sign-in action. This finding led to the guest handoff integration described above.

### Owner-supplied tombstone mark and website icons

- Recolor the supplied tombstone/X image teal → blue → purple with the built-in image tool. Keep transparent background/cutout; resize for favicon, touch and interface use. Record the source hash, selected asset, consumers and prompt in [asset notes](parity/2026-10-15/tombstone-brand.md).
- Add one BrandMark component for homepage/shared/login branding, Projects and branded AI actions. Remove the old mountain glyph and C-shaped Ask icon. Add 16/32/48 pixel favicon PNGs, a multi-resolution ICO and 180 pixel Apple touch icon with explicit app base paths in metadata. Preserve the existing independence disclaimer.
- Compared the owner's supplied mark and requested palette, not Canva-owned logo artwork. Inspect the generated app asset and small favicon, verify RGBA dimensions, transparent cutout/background and ICO frames. This is a deliberate branding exception, not a visual-parity claim.
- Validation: typecheck, 124 unit tests and changed-file supplemental lint pass. Required `npm run lint` remains absent; its setup is separate pending work. Production build passes; its rendered homepage contains five valid base-path-aware icon links and the two header/footer brand images. Existing browser blocker prevents viewport screenshots; no app deployment or merge.

### Local multi-page downloads

- Replace the fixed active-page export and inert Digital/Print/Advanced Settings placeholders with a working Download panel: file selector, All/This page/Custom ranges, image dimensions, JPG quality, PNG/SVG transparency, optional local preferences, progress/cancel, keyboard dismissal and actionable errors. Format availability is never tied to a plan.
- Export a document snapshot in page order, deduplicate page choices, exclude speaker notes, prepare fonts used on hidden pages, and stop on any rendering failure. Multi-image/SVG exports use an original ZIP32 writer; one page downloads directly. PDF Standard/Print lazily load the existing `pdf-lib` dependency and create flattened RGB documents locally. No design/media upload or new service.
- Keep explicit gaps: selectable/vector PDF text, physical print units, CMYK, crop/bleed, passwords, PDF accessibility, font embedding, archive compression options, file-size estimates, PPTX, video and GIF. Current memory bounds are 8,192 pixels per raster edge, 32 million raster pixels and 256 MiB per output; these are implementation limits, not paid gates or accepted permanent exceptions.
- Compared: [Canva download workflow](https://www.canva.com/help/download-or-purchase/), [flattened PDF](https://www.canva.com/help/download-flattened-pdf/), [transparent background](https://www.canva.com/help/transparent-background/) and [file types](https://www.canva.com/help/download-file-types/), accessed 2026-10-15. Reviewed the official [PDFDocument API](https://pdf-lib.js.org/docs/api/classes/pdfdocument) and [ZIP specification](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT). These sources establish behavior/options, not measured layout parity.
- Validation: 124 unit tests, typecheck and supplemental changed-file lint pass. An independent Python ZIP reader and system `unzip -t` validate names, data and CRCs. PDF tests read real output, verify page dimensions/order and check renderer options. Playwright discovers 22 cases including local ZIP/PNG/PDF downloads at both widths; browser execution and before/after captures remain blocked. Required `npm run lint` still reports the missing baseline script. Production build passes. React lifecycle, cancellation cleanup, keyboard access and lazy PDF loading reviewed with the React best-practices skill.

### Local presentations and speaker notes

- Replace bare SVG opening with an authenticated local presentation route. Start at the selected page; support arrows, space, Home/End, page number, tap/swipe, fullscreen/escape, autoplay timing/loop, presenter notes/next-page preview and elapsed time.
- Presenter view opens a separate audience window and synchronizes slide changes through same-origin BroadcastChannel. A read-only library reader follows saved edits without writing or replacing editor state. Corrupt updates retain the last readable slide with an error; missing designs show a recovery path. Pop-up/fullscreen limitations get explicit feedback. Unsaved/conflicted designs must be saved before presenting another view.
- Store private notes per page, preserving them through legacy migration, duplication, undo/redo and local backup. Notes never enter rendered slide SVG or the audience DOM. Hide analytics choice prompts while projecting slides; canonicalize presentation routes without IDs/session tokens.
- Compared: [Canva presentation modes](https://www.canva.com/help/presentation-modes/) and [presenting designs](https://www.canva.com/help/presenting-designs/), accessed 2026-10-15. Documentation establishes navigation, two windows, notes, autoplay and live edits; it does not establish visual parity. Remote control across devices, drawing, animated shortcuts, media timers, offline app loading and recording remain implementation work.
- Validation: 110 unit tests, typecheck, production build, supplemental changed-file lint and diff checks pass. Playwright discovers 20 cases, including presentation and audience/notes checks at both widths; no execution or new screenshots because the documented browser blocker remains. Required `npm run lint` still reports the absent baseline script. React lifecycle, resource cleanup, readonly persistence and accessible controls reviewed with the React best-practices skill.

### Editor spacing, template browsing and page dock

- Compared the owner's editor composite (original left, clone right) with source layout and behavior. [Reference notes](parity/2026-10-15/editor-reference.md) record visible differences, source dimensions/hash and limits: different pane widths and 56%/71% zoom prevent direct pixel measurements.
- Use a narrower collapsible panel, denser frameless template grid, canvas-aware ordering and real template search/empty state. Keep original generated templates and SVG icons; no copied Canva assets or new icon/font dependency.
- Enlarge/center page thumbnails and add a working dock button. Refine workspace shadow/colors, bottom bar and original timer/undo/redo/tools/save icons. Local-save status stays accessible. Fit reads actual padding instead of stale dimensions.
- Add a mobile panel overlay that starts closed, dismisses after content insertion, and keeps canvas width available; adapt header and popovers. Update regression locators for the accessible save status and mobile text-panel behavior. Fix grid Enter handling so Ctrl/Cmd+Enter reaches the add-page shortcut.
- Validation: 105 unit tests, typecheck, production build, supplemental changed-file lint and diff checks pass. Playwright discovers 18 cases including the new shell checks at 1440 and 390; execution and new before/after captures remain blocked. `npm run lint` still reports the missing baseline script. No match status claimed.

### Keep legacy pricing redirects inside the app base path

- Correct the old pricing redirect to pass `/` to Next.js. The framework adds its configured `/canvaisdead` base path; adding it manually would duplicate it. Old pricing links therefore lead home without presenting paid plans.
- Compared: installed Next.js `app-render` redirect handling and `addPathPrefix`, plus the existing `lib/basepath.ts` guidance. No visual surface changes.
- Validation: production build, typecheck and supplemental changed-file lint pass; `npm run lint` remains unavailable. Actual browser navigation remains blocked.

### Shared website PostHog analytics

- Integrate the owner's existing US project using explicit `website_*` events and `app_id`, `suite_id`, `platform`, `surface`, `route`, `schema_version`, `environment`. Document every event and the cross-app contract in `docs/ANALYTICS.md`.
- Replace the ineffective cookie banner with actual opt-in controls. No analytics before consent; support withdrawal, cross-tab preferences and browser privacy signals. Omit design/media/content/identity data, full URLs, raw errors, session replay and autocapture. Files remain local; consented usage metadata is sent to PostHog as explicitly requested.
- No new service, package dependency, payment change, deployment or billing change. Credentials stay outside Git. Production setup/receipt remain unverified: Vercel API returns 403 and CLI cannot load its user; local browser/network execution is blocked.
- Compared: owner requirements, official PostHog Capture API and anonymous-event documentation. This is instrumentation, not a claim of visual parity.
- Validation: 102 unit tests, typecheck, production build, supplemental changed-file lint and diff checks pass. The repository still has no `npm run lint` script. Actual browser consent/network verification and PostHog receipt remain outstanding. Vercel CLI fallback fails both inside and outside the sandbox; production variables are not set.

### CanvaIsDead branding and everything included

- Use CanvaIsDead in navigation, dashboard headings, project branding, editor labels, AI placeholder messages and document metadata. The original proposal retained the named-company disclaimer. The owner's later correction in #21 removes that name from displayed copy; this stack now uses generic third-party attribution while keeping the independence disclaimer.
- Remove the old pricing page's paid plan cards, billing toggle, add-on banner and sales CTAs; old `/pricing` links redirect home. Remove paid comparisons from the alternate marketing component/configuration too. All available functionality is included, with no trial, upgrade, payment or subscription flow. Unimplemented features remain tracked as gaps.
- Compared: owner requirements and all app/component/configuration strings. Intentional scope exception to the original's paid tiers; no payment backend changed.
- Validation: 89 unit tests, typecheck, production build and supplemental changed-file lint pass. The required `npm run lint` attempt reports the existing missing-script issue. Browser screenshots remain blocked.

### Google and email only, with an original SaaS-is-dead backdrop

- Remove the disabled Facebook, alternate-method and work-email controls and their separator from the login/signup chooser. Copy now names Google and email explicitly. Reuse the existing official Google button; email sign-in, signup and password recovery retain their existing handlers.
- Compared: owner’s explicit provider scope and the chooser, email form and Firebase client helpers. No Microsoft, Apple or enterprise SSO handler exists. The development/demo test path remains controlled by the existing demo configuration.
- Replace generic report/strategy cards with original SaaS-is-dead jokes and hand-drawn SVG ghosts, crossed-out cards and flowers. Preserve the collage layout and palette. This is an owner-requested visual exception, not a claim of matching Canva's artwork.
- Validation: 89 unit tests, typecheck, production build and supplemental changed-file lint pass. `npm run lint` remains unavailable (no script). No new tests for reversible UI copy/provider removal. Browser screenshots and live account checks remain blocked; the supplied editor comparison is not evidence of the login changes.

### Multi-page designs

- Before: designs held one canvas, Add page showed an unsupported message, and the page strip/count were static.
- After: a page-based format preserves legacy single-page files without rewriting them on read. Add, duplicate, title, delete and reorder pages with document-wide undo/redo. Keep element/background changes isolated to their page, resize all pages together and apply templates to the selected page. New backups use version 2; imports validate and copy every page and still accept version 1.
- Add real thumbnails, grid view, arrow/Home/End navigation, move controls and desktop drag reorder. Export/Present explicitly target the selected page; full multi-page export and slideshow navigation remain separate work. Scrolling view, multi-page selection, page clipboard, native touch dragging and responsive editor layout remain gaps.
- Compared: [Canva's page-management help](https://www.canva.com/en_in/help/manage-pages/), accessed 2026-10-15, plus storage/history/renderer behavior. The help describes page controls, thumbnails, grid, reordering, titles and a 350-page limit. This is documentation-level evidence only; no visual parity claim.
- Validation: 89 unit tests, typecheck, production build and supplemental lint on changed code pass. Regression coverage includes legacy migration, queued edits, duplication isolation, history, last-page protection, all-page resize, selected-page templates/export, backup round trips and corrupt data preservation. Playwright discovers 16 cases including a new page workflow at both widths; execution and before/after screenshots remain blocked. `npm run lint` still fails because the script is absent. React state, memoization and keyboard access reviewed with the React best-practices skill.

### Disable automatic parity previews

- Before: opening and updating parity branches automatically triggered Vercel preview builds, conflicting with the no-new-cost requirement while account billing is unverified.
- After: use Vercel's `git.deploymentEnabled` branch rule to skip `parity/**` before deployment. Unspecified branches keep their existing deployment behavior. Future parity branches must include this configuration in their first published commit. Existing PR branches without this configuration must not be updated until it is included.
- Compared: [official Git configuration documentation](https://vercel.com/docs/project-configuration/git-configuration), accessed 2026-10-15. This is a development workflow change with no visual surface; screenshots do not apply. It is not a claim that the existing hosting account has zero charges.
- Validation: JSON parsing and minimatch checks pass for all parity branch names plus a nested parity branch; main, develop and an unrelated feature branch remain enabled. All 25 unit tests, typecheck, production build and diff checks pass with the documented dependency fallback. `npm run lint` still fails because the repository has no lint script. After publication, GitHub reported no Vercel commit status or preview comment for #5–#9, consistent with the documented exclusion; GitGuardian completed successfully for #5. This is not a billing audit. All five first published commits include the exclusion, while #1–#4 retain their original branches and prior previews.

### Preserved text layout

- Before: layout collapsed whitespace, retained carriage returns inconsistently, and let long words overflow. Text width measurement ignored italic styling even when the rendered text was italic.
- After: preserve leading/repeated/trailing spaces and blank lines, normalize CRLF/CR for layout, and wrap long tokens at grapheme boundaries on engines with Intl.Segmenter (code-point fallback on older engines). SVG explicitly preserves whitespace. Canvas, SVG and selection height share wrapping and italic metrics. Binary search avoids repeated prefix measurements for large pasted tokens. Stored text is not rewritten.
- Compared: source behavior, model/raster tests, [W3C CSS Text whitespace and overflow rules](https://www.w3.org/TR/css-text-3/) and [ECMA-402 segmentation](https://tc39.es/ecma402/#segmenter-objects), accessed 2026-10-15. These standards inform the implementation; they do not establish Canva parity. Tab stops, language-specific wrapping/shaping and trailing-space alignment remain open.
- Add unit coverage for whitespace/line endings, long tokens, zero-width boxes, emoji/combining/Indic sequences, italic metrics, SVG/raster agreement and bounded measurement work. Add a browser edit/reload/SVG-download scenario at both widths; browser execution and captures remain blocked.
- Validation: 80 unit tests and typecheck pass. Supplemental changed-file lint, production build and Playwright discovery (14 cases) pass. A wider supplemental lint run finds seven baseline issues in session logout, shared auth helpers and the unused generic store; root lint is still missing. This branch inherits the parity deployment exclusion from #5.

### Rotation-aware resize

- Before: resize applied canvas-axis deltas directly to rotated objects and moved their fixed edge. Ratio locking used horizontal motion only; minimum clamps could distort the aspect ratio, and resizing one axis could widen an already-thin shape on the other axis.
- After: transform the pointer delta to local axes, choose dimensions and move the center around the unchanged opposite edge/corner. Ratio-locked corners respond to either axis and keep the ratio at the minimum size. Thin shapes and line thickness are preserved when resizing another axis.
- Text corner handles scale font size and width together; side handles reflow text from its fixed top edge. Recompute text height to keep the actual opposite anchor fixed, including minimum-width/font clamps. This text-anchor behavior is an implementation choice that still needs comparison with the original.
- Compared: geometric invariants for every handle at eight angles, a known 90-degree case, ratio limits, thin shapes, lines, text reflow and minimum font sizes. Add a browser drag/undo scenario at both widths with before/after screenshot outputs; execution remains blocked.
- Validation: 68 unit tests and typecheck pass. Supplemental changed-file lint passes; root lint remains unavailable. Production build and Playwright discovery (12 cases across both widths) also pass. This branch inherits the parity deployment exclusion from #5.

### Portable local backups

- Add Back up designs / Import backup to Home → Your designs and Projects, available even in an empty library. Downloads contain every design and its embedded uploaded media; imports create new IDs without replacing existing designs. Show import progress, success and errors; storage failures retain the imported copies in memory for retry.
- Validate the whole versioned file before adding designs; reject invalid model data, duplicate element IDs, unsupported file versions, SVG paint-server URLs and external/non-raster image sources. Limit imports to 50 MB and explain this limit. Escape fill/stroke/background values in SVG output. Never upload backup files or provision a service.
- Persist editor commits before paint/navigation so immediately reopening an imported design does not miss its most recent edit. Update README to remove the outdated Firestore-sync plan and explain local backups and storage limits.
- Compared: model, renderer and local-storage behavior. Unit tests cover all existing templates, text/lock/image round trips, original preservation, independent copies, invalid payloads, remote image rejection and failure/retry. Playwright adds downloaded-file restore/edit/reload and invalid-file preservation flows at both widths; execution and screenshots are still blocked.
- Validation: 55 unit tests and typecheck pass; supplemental ESLint passes on changed files. Production build and Playwright discovery (10 cases across both widths) also pass. Root lint is still missing. This branch inherits the parity deployment exclusion from #5.

### Reliable local saves

- Before: read/parse/write failures were swallowed, the editor always displayed a cloud Saved indicator, and creation navigated before the storage effect completed.
- After: synchronous local writes, explicit saved/unsaved/read-error/conflict state, retry and local JSON recovery downloads. Failed reads preserve the original stored bytes. Unsaved edits survive client-side navigation in browser memory, and closing/reloading with unsaved changes triggers a browser warning where supported. User namespaces remain separate; the server does not cache design data.
- Validate stored libraries before rendering. Detect another tab’s changed library before writing and require a backup/reload instead of overwriting it. This comparison is not an atomic lock; simultaneous writes and automatic merging still need work.
- Preserve all design/media data locally; add no storage provider, network upload, paid API, environment variable or billing change. Recovery backup files include embedded uploaded image data. Restore/import UI was subsequently added in the portable-backups change above.
- Compared: storage lifecycle and source behavior. Regression tests cover failed reads, corrupt data, quota/access failures, synchronous persistence, latest-edit retry, namespace separation and detected cross-tab conflicts. Add two Playwright scenarios at both required widths for error/retry/backup/reload and corrupt-data preservation; execution and screenshots remain blocked by browser launch.
- Validation: 37 unit tests, typecheck, changed-file supplemental ESLint and Playwright discovery (6 cases including locks) pass. `npm run lint` still fails because the script is absent. Production build also passes. React hook dependencies, stable store subscriptions, SSR isolation and error accessibility reviewed with the React best-practices skill.

### Persistent element locks

- Before: a transient Set blocked pointer dragging but was lost on reload and bypassed by element edit, deletion and keyboard actions.
- After: saved `El.locked`, explicit lock/unlock history entries, guarded model operations, selectable locked objects, hidden resize/style controls and disabled destructive menu actions. Duplicate copies retain their lock; whole-design operations such as page resize retain their existing semantics.
- Add regression coverage for persistence, undo/redo, protected content/geometry/style/deletion, hit-testing and no-op history. Add a Playwright flow for both widths (`npm run build` then `npx playwright test`) with unlocked/locked screenshots in ignored `test-results`. Test code is present; browser execution is still blocked.
- Validation: 25 unit tests, typecheck, production build, changed-file ESLint/TypeScript/hooks checks, diff checks and Playwright test discovery (2 viewport cases) pass. Browser tests were not executed successfully. The repository-wide lint setup and unrelated baseline findings remain outstanding.

### Free app messaging

- Replace the nonexistent 30-day trial promotions with “Free forever” in the dashboard, templates, projects and editor. Remove the dashboard crown from this badge. No payment behavior or feature access changes.
- Intentional difference from Canva’s upsell messaging, explicitly requested by the owner. Paid Canva features remain required implementation work.
- Source/copy comparison only; both viewport captures remain blocked. Typecheck, 21 tests and production build pass. `npm run lint` is missing; a supplemental external ESLint/TypeScript/hooks run identifies four pre-existing issues, so lint is not green.

### Official Google sign-in button

- Before: login chooser drew its own flat-color G and inherited app-wide login-button rules.
- After: reuse the existing official gradient-G `GoogleButton`, including its Google Sans font, sizing, approved copy, focus and disabled states. Exclude it from login-specific button/span CSS. Firebase sign-in flow and configuration behavior are unchanged.
- Compared: [Google branding guidelines](https://developers.google.com/identity/branding-guidelines), accessed 2026-10-15, and the repository’s existing official asset/component. Real Canva and before/after screenshots remain blocked.
- Checks: run unit tests, typecheck, build and lint for this PR; lint configuration remains absent. Keep draft pending browser review.

### Text decorations

- Before: Underline and Strikethrough buttons only showed unsupported messages; styles were absent from the saved model and all exports.
- After: independent style flags, pressed-state buttons, decorated in-place editor and SVG, and colored/aligned lines in PNG/JPG rendering. Legacy designs remain undecorated. Restore the full raster font after wrap measurement so italic is retained.
- Compared: source behavior and renderer/history/serialization unit tests. Native SVG font decoration metrics versus raster line placement still require visual comparison.
- Checks: 21 unit tests pass; typecheck passes. Production build and lint results recorded in PR. No paired before/after screenshots: browser launch is blocked. Keep PR draft until required browser review and lint pass.

## Justified scope differences and unresolved decisions

- All replica functionality is free; pricing, subscriptions, trials and upsell gates are intentionally omitted. This does not waive functionality.
- Authentication intentionally offers only Google and email/password, with email recovery. Other providers and workplace SSO are excluded by explicit owner direction.
- Independent branding, generated/open-license assets, OFL font substitutes, and the existing disclaimer/footer remain intentional asset differences.
- Owner explicitly requires local-only design/media persistence and no new billable services. Hosted cloud synchronization is excluded; portable local backups and free local feature implementations remain in scope. Existing hosting/authentication and GitHub usage cannot be certified cost-free without checking the owner’s plans and billing settings. No billing configuration has been changed.
- Unavailable browser/network access is a blocker, not a parity exception. No missing functional row is waived.
- Need working browser + external connectivity, disposable mailbox access, and an authenticated original test session to finish observation. Paid features may require an owner-provided paid reference session or authorized captures; no trial or payment may be started under the current instructions.
- Need clarification of “the log.” AI inference, realtime collaboration, publishing, and enterprise identity need architectures consistent with local data and no new paid services. Features requiring hosted persistence or recurring infrastructure need a human decision; do not silently add billable infrastructure.

**Completion: not achieved.** No row is marked match without the required evidence.
