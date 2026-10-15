# CanvaIsDead parity report

Updated: 2026-10-15. Baseline: `676b6686143e2481d1ffac3400e21a54e1046941`.

## Scope and completion rule

The latest product direction takes precedence over the initial free-tier brief:

- Logged-out scope: homepage and login/signup/password recovery. The additional phrase “the log” awaits clarification (logo or blog). A separate pricing page is out of scope.
- Authentication is limited to Google and email/password, including email password recovery. Facebook, Apple, Microsoft, workplace SSO and other identity providers are intentionally excluded by the owner’s 2026-10-15 clarification.
- Logged-in scope: **all Canva functionality, including paid functionality, offered free in the replica**. No subscriptions, trials, upgrade gates, or payment implementation.
- Designs, uploaded media and backups must remain local to the user’s device. Do not introduce billable storage, AI APIs or other paid services. Code/PRs are published to GitHub as requested; existing Vercel hosting and Firebase authentication remain external services whose account costs have not been verified.
- Paid availability in Canva is not an exception. Brand Kit, AI tools, premium-equivalent assets, advanced export, and team features remain implementation work.
- Original assets and open-license fonts replace Canva-owned assets. Preserve the existing independence disclaimer/footer. Never copy Canva templates, photos, fonts, or logos.
- Do not merge parity PRs. Each logical area requires code checks and before/after screenshots at 1440 × 900 and 390 × 844, paired with original captures.

`match` means observed and verified at both widths, including behavior; `differs` means a concrete difference has been found; `missing` means the capability is absent. `pending` is an interim audit marker for unobserved behavior, **not** a match or justified exception. No browser comparison has yet completed. This report is an initial inventory, not an exhaustive sign-off.

Severity: P0 = data loss/security; P1 = core functionality unavailable or misleading; P2 = significant UI/behavior/accessibility difference; P3 = minor visual detail. Severity for pending rows is provisional.

## Evidence and environment

- PRs #1–#4 triggered automatic Vercel previews. The owner requires local design/media storage and no new costs. `vercel.json` now disables Git-triggered deployments for `parity/**` branches; all other branches retain Vercel's default behavior. This prevents future parity preview builds, but cannot establish or remove charges from existing hosting/authentication or past deployments. See [Vercel's documented branch controls](https://vercel.com/docs/project-configuration/git-configuration). No billing settings, environment variables or secrets were changed.
- Source retrieved through the GitHub connector because `git clone` fails DNS resolution, including after escalation. The local snapshot tree hash matches upstream (`c50d0e3717e862868253aea985dcefcee25bbd48`) and has an independent baseline commit; PRs must parent the real upstream commit through the connector, not push the synthetic history.
- No repository `AGENTS.md`, `CONTRIBUTING.md`, or `.env.example` exists at this baseline. No `.env` file or secret was added or retrieved. Firebase account checks require the live deployment.
- `/workspace/isdead-shots/parity/canvaisdead/` is absent. Existing `public/home/*.png` are repository product assets, not newly captured parity evidence.
- Local DNS fails for GitHub, Canva, and npm. `npm ci --offline` also fails on uncached `retry-request@9.1.0`. Local typecheck/tests/build use the adjacent MiroIsDead installation; direct dependency versions for Next, React, Firebase, Firebase Admin, TypeScript, Vitest, Playwright, and types match this lockfile. This is not a successful clean install. Firebase packages also warn that this host's Node version is below their required Node 24.12.
- Typecheck and baseline production build pass with that dependency fallback; baseline has 16 passing unit tests. `npm run lint` fails because no lint script/configuration is present.
- The requested `NODE_OPTIONS=--unhandled-rejections=warn npm run dev` starts after escalation on port 3187. It emits file-watcher `EMFILE` warnings. Production serving succeeds locally.
- In-app browser execution is unavailable. Playwright Chromium fails during launch with macOS Mach-port permission errors; installed Chrome also exits during launch, including after escalation. A cached Firefox 1555 also aborts with SIGABRT both inside and outside the sandbox (rechecked 2026-10-15). No original or clone browser screenshot/computed-style measurement has been produced. Neither throwaway account has been created. No SSO, payment, trial, or real-person sharing was attempted.
- [Canva homepage](https://www.canva.com/) is readable through web retrieval; that confirms page structure only, not layout or interaction. All paired captures are still required.
- [REA](https://github.com/morluto/rea), suggested by the owner, offers browser capture/comparison and JavaScript analysis. Its [browser workflow](https://github.com/morluto/rea/blob/main/docs/browser-observation.md) is relevant once a browser can run. It is not an editor component library. No REA code or proprietary original code has been imported.

Screenshot notation below: `blocked` = capture infrastructure unavailable, never evidence of a match. Expected evidence directory: `docs/parity/YYYY-MM-DD/`, with original/clone-before/clone-after names and viewport width. Keep authentication artifacts and account credentials outside the repository.

## Public surfaces

| Screen / feature | Status | Severity | Evidence / next verification | Screenshots |
| --- | --- | --- | --- | --- |
| Homepage sections and copy | differs | P2 | `CvHome.tsx` contains AI/collaboration claims for unimplemented features and decorative template placeholders. | blocked |
| Homepage font metrics, gradients, spacing, illustrations | pending | P2 | Open-license Jakarta is present; measure against original at both widths. | blocked |
| Homepage navigation and mega-menus | missing | P2 | All `CvNav` navigation entries use `href="#"`; no mega-menu implementation. | blocked |
| Homepage feature tabs and carousel controls | missing | P2 | Static buttons without state/actions. | blocked |
| Homepage hover/focus/animation and reduced motion | pending | P2 | Browser and keyboard checks required. | blocked |
| Homepage footer | differs | P2 | Preserve disclaimer; links and download labels require functional audit. | blocked |
| Homepage cookie preferences | missing | P2 | Cookie component exists only in login, is hidden on desktop by `.cvl-ck{display:none}` (shown again in mobile CSS), and has no actual preferences. | blocked |
| Login layout, backdrop, typography and mobile reflow | pending | P2 | `CvLogin.tsx`; no paired rendering yet. | blocked |
| Google sign-in logo/button | pending | P2 | Chooser now reuses the vendored official `GoogleButton`, matching the email form. Login CSS excludes it so Google font, spacing, colors, logo proportions and focus styles survive. Browser checks outstanding. | blocked |
| Email login, signup, forgot password | pending | P1 | Firebase handlers exist; production account flow untested. | blocked |
| Validation/error messages and focus | pending | P2 | `LoginForm.tsx` and auth helpers; compare actual invalid/expired/email-taken cases. | blocked |
| Other identity providers / workplace SSO | differs | P2 | Justified scope exception: owner requests only Google and email/password. Remove Facebook, alternative-method and work-email provider controls. Microsoft/Apple/SSO flows are not implemented or planned. Ordinary work email addresses can use email/password. | blocked |
| Cookie consent dialog | differs | P2 | “Manage cookies” performs the same acceptance as “Accept all”; nonessential cookie claims are not backed by implementation. | blocked |
| Onboarding questions | missing | P2 | Signup routes directly into app; no onboarding flow found. | blocked |
| Logo/blog scope clarification | pending | P2 | Owner said “the log”; clarification requested. | blocked |

## Dashboard and library

| Screen / feature | Status | Severity | Evidence / next verification | Screenshots |
| --- | --- | --- | --- | --- |
| Main rail and collapse behavior | differs | P2 | `AppShell.tsx`: collapse button inert; several destinations route to Home. | blocked |
| Home hero and visual hierarchy | pending | P2 | Compare typography, gradient, spacing and responsive states. | blocked |
| Trial messaging | differs | P1 | Intentional scope difference: Home, Templates, Projects and editor now say “Free forever,” with no trial/upgrade action. No features are gated. Browser evidence still pending. | blocked |
| Search designs and templates | differs | P1 | Home filters; Templates page still renders fixed discovery/trending lists. | blocked |
| Quick-create row | differs | P1 | Several controls do nothing; Video creates a thumbnail; Custom size chooses logo dimensions. | blocked |
| Template strips and category tiles | differs | P2 | Original generated art exists; category placeholders and inert “See all” remain. | blocked |
| Create design menu / dimensions / units | missing | P1 | Create rail link goes Home; no dimension-entry dialog. | blocked |
| Projects listing and All projects empty state | differs | P1 | Local-only data; sidebar/filter/folder controls largely static. | blocked |
| Project folders, starred, trash and restore | missing | P1 | No folder/trash/star data model or actions. | blocked |
| Profile/account/workspace menu | missing | P2 | Avatar submits logout immediately. | blocked |
| Brand dashboard | missing | P1 | Rail entry goes Home. | blocked |
| Apps dashboard | missing | P1 | No Apps route. | blocked |
| Notifications and Help | missing | P2 | Inert controls. | blocked |
| Search/loading/empty/error states | differs | P2 | Some empty states present; initial local loading and failures need explicit treatment. | blocked |

## Editor chrome, panels and object operations

| Screen / feature | Status | Severity | Evidence / next verification | Screenshots |
| --- | --- | --- | --- | --- |
| Gradient top bar / responsive layout | pending | P2 | Compare at 1440 and 390; fixed panel/toolbar dimensions need browser inspection. | blocked |
| File menu | missing | P1 | Button has no action. | blocked |
| Resize | differs | P1 | Presets work in source; no custom size, copy-and-resize or responsive reflow. Free access must remain. | blocked |
| Editing mode selector | missing | P2 | Button has no action. | blocked |
| Undo/redo | pending | P1 | Immutable history has unit coverage; real interaction parity unverified. | blocked |
| Editor rail | differs | P1 | AI, Tools, Projects and Apps buttons inert; Brand opens background color. | blocked |
| Design/Templates panel | differs | P1 | Template application exists; search input has no filtering. | blocked |
| Elements panel/search/categories | differs | P1 | Five shapes work; category buttons/search do nothing. | blocked |
| Text panel presets | differs | P2 | Heading/subheading/body add text; search, Magic Write and brand-font controls inert. | blocked |
| Uploads panel | differs | P1 | Single raster upload only, no asset library or drag/drop. | blocked |
| Brand Kit panel | missing | P1 | No actual kit/font/logo/color persistence. | blocked |
| Tools / Projects / Apps panels | missing | P1 | No panel implementations. | blocked |
| Canvas zoom/pan | differs | P2 | Relative zoom exists; no pan control. | blocked |
| Selection handles / rotation handle | pending | P2 | Circle corners, bar edges, rotation handle below exist; verify sizes and interaction. | blocked |
| Rotation-aware resize | pending | P1 | Pointer deltas now use local axes and preserve the opposite anchor at every angle. Corner ratio clamps and text scaling/reflow have geometry coverage. Actual pointer/render behavior and comparison with Canva remain outstanding. | blocked |
| Floating toolbar appearance | pending | P2 | Compare position, sizing, icons and focus behavior. | blocked |
| Ask Canva / element links / comments | missing | P1 | Toolbar displays unsupported toasts. | blocked |
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
| Page strip and grid view | differs | P1 | Real thumbnails, page counts, selection and grid view implemented. Scrolling canvas view, multi-page selection, page clipboard and native touch dragging remain absent. Move buttons provide a touch/keyboard alternative to dragging. | blocked |
| Notes / Timer / bottom bar | missing | P2 | Notes and Timer are static labels. | blocked |

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
| Font loading and layout refresh | differs | P2 | SVG layout is memoized by design only; late font loading does not trigger remeasurement. Verify font swaps and add a font-ready subscription. | blocked |

## Sharing, export and persistence

| Screen / feature | Status | Severity | Evidence / next verification | Screenshots |
| --- | --- | --- | --- | --- |
| Share menu layout and keyboard behavior | pending | P2 | UI present; many actions below are placeholders. | blocked |
| Access control / invitations / collaboration | missing | P1 | Static people/access controls; no sharing model or collaboration transport. | blocked |
| Public view link / copy link | differs | P1 | Copies local editor URL although designs exist only in this browser. | blocked |
| Download PNG/JPG/SVG | pending | P1 | Renderers implemented; real download/content checks outstanding. | blocked |
| PDF / PPTX / video / GIF export | missing | P1 | No export UI or implementations for these types. | blocked |
| Export pages / size / quality / transparency | differs | P1 | Export uses the selected page and labels its number/title in Download; multi-page filenames include the page number. No page-range/all-page archive controls; raster export fixed at 1× with opaque page fill. | blocked |
| Present mode and presenter view | differs | P1 | Opens the selected page as bare SVG in another tab; no slide navigation or presenter controls. | blocked |
| Present and record | missing | P1 | Inert Share action. | blocked |
| Publish as website / link settings | missing | P1 | Inert Share action. | blocked |
| Google Drive / third-party export | missing | P1 | Inert Share action. | blocked |
| Autosave and save-state reporting | pending | P0 | Local-only writes now report errors, retain unsaved edits, allow retry and download a JSON recovery backup. Failed reads never replace existing data. Creation waits for a successful write before navigation. Browser checks outstanding. | blocked |
| Local recovery backups | pending | P1 | Home and Projects offer full-library JSON downloads and import as new editable copies. Version 2 preserves every page; version 1 remains importable. Validate every page, including embedded images, text styles and locks; malformed files, unsupported versions and remote images are rejected. Browser checks outstanding. | blocked |
| Simultaneous editing across tabs | differs | P1 | A changed stored library is detected before writing, preserving this tab’s edits for backup. No automatic merging or transactional multi-tab synchronization. | blocked |
| Cloud sync / cross-device reopen | differs | P1 | Intentional exception to hosted synchronization: owner requires local-only design/media storage and no new costs. Do not wire up the unused generic Firestore store. Portable local backup/restore is implemented as the alternative; browser verification remains outstanding. | blocked |
| Rename design | pending | P2 | Name input updates model; reload and accessibility checks outstanding. | blocked |
| Delete design | differs | P1 | Browser confirm + permanent removal; no trash recovery. | blocked |
| Duplicate design | missing | P1 | Element duplication exists; dashboard design duplication absent. | blocked |
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
| Responsive logged-in layout / touch | differs | P1 | Later desktop CSS overrides the earlier narrow-width rules: editor rail is 72px and panel 360px, both non-shrinking, exceeding 390px before the canvas. A mobile panel/toolbar layout and actual touch checks are required. | blocked |
| Lint and repeatable browser checks | missing | P1 | No lint command; unused `name`/`uid` and the non-hook `useQC` naming issue have been corrected in touched files. The raster unused-expression finding was also corrected. A wider scan finds seven baseline issues in session logout, shared auth helpers and the generic store; a committed lint command/configuration is still required. Existing shots script uses stale selectors and hard-coded `/workspace` output. | blocked |

## Change log

Open draft PRs: [#1 text decorations](https://github.com/tommy-muckstack/canvaisdead/pull/1), [#2 official Google button](https://github.com/tommy-muckstack/canvaisdead/pull/2), [#3 free messaging](https://github.com/tommy-muckstack/canvaisdead/pull/3), [#4 persistent locks](https://github.com/tommy-muckstack/canvaisdead/pull/4), [#5 skip parity previews](https://github.com/tommy-muckstack/canvaisdead/pull/5), [#6 reliable local saves](https://github.com/tommy-muckstack/canvaisdead/pull/6), [#7 local backup/restore](https://github.com/tommy-muckstack/canvaisdead/pull/7), [#8 rotated resizing](https://github.com/tommy-muckstack/canvaisdead/pull/8), [#9 text layout](https://github.com/tommy-muckstack/canvaisdead/pull/9), [#10 multi-page designs](https://github.com/tommy-muckstack/canvaisdead/pull/10). PRs are stacked to keep this report continuous. Nothing merged.

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
