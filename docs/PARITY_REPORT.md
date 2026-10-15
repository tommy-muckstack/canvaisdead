# CanvaIsDead parity report

Updated: 2026-10-15. Baseline: `676b6686143e2481d1ffac3400e21a54e1046941`.

## Scope and completion rule

The latest product direction takes precedence over the initial free-tier brief:

- Logged-out scope: homepage and login/signup/password recovery. The additional phrase “the log” awaits clarification (logo or blog). A separate pricing page is out of scope.
- Logged-in scope: **all Canva functionality, including paid functionality, offered free in the replica**. No subscriptions, trials, upgrade gates, or payment implementation.
- Paid availability in Canva is not an exception. Brand Kit, AI tools, premium-equivalent assets, advanced export, and team features remain implementation work.
- Original assets and open-license fonts replace Canva-owned assets. Preserve the existing independence disclaimer/footer. Never copy Canva templates, photos, fonts, or logos.
- Do not merge parity PRs. Each logical area requires code checks and before/after screenshots at 1440 × 900 and 390 × 844, paired with original captures.

`match` means observed and verified at both widths, including behavior; `differs` means a concrete difference has been found; `missing` means the capability is absent. `pending` is an interim audit marker for unobserved behavior, **not** a match or justified exception. No browser comparison has yet completed. This report is an initial inventory, not an exhaustive sign-off.

Severity: P0 = data loss/security; P1 = core functionality unavailable or misleading; P2 = significant UI/behavior/accessibility difference; P3 = minor visual detail. Severity for pending rows is provisional.

## Evidence and environment

- Source retrieved through the GitHub connector because `git clone` fails DNS resolution, including after escalation. The local snapshot has an independent baseline commit; PRs must parent the real upstream commit through the connector, not push the synthetic history.
- No repository `AGENTS.md`, `CONTRIBUTING.md`, or `.env.example` exists at this baseline. No `.env` file or secret was added or retrieved. Firebase account checks require the live deployment.
- `/workspace/isdead-shots/parity/canvaisdead/` is absent. Existing `public/home/*.png` are repository product assets, not newly captured parity evidence.
- Local DNS fails for GitHub, Canva, and npm. `npm ci --offline` also fails on uncached `retry-request@9.1.0`. Local typecheck/tests/build use the adjacent MiroIsDead installation; direct dependency versions for Next, React, Firebase, Firebase Admin, TypeScript, Vitest, Playwright, and types match this lockfile. This is not a successful clean install. Firebase packages also warn that this host's Node version is below their required Node 24.12.
- Typecheck and baseline production build pass with that dependency fallback; baseline has 16 passing unit tests. `npm run lint` fails because no lint script/configuration is present.
- The requested `NODE_OPTIONS=--unhandled-rejections=warn npm run dev` starts after escalation on port 3187. It emits file-watcher `EMFILE` warnings. Production serving succeeds locally.
- In-app browser execution is unavailable. Playwright Chromium fails during launch with macOS Mach-port permission errors; installed Chrome also exits during launch, including after escalation. No original or clone browser screenshot/computed-style measurement has been produced. Neither throwaway account has been created. No SSO, payment, trial, or real-person sharing was attempted.
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
| Homepage cookie preferences | missing | P2 | Cookie component exists only in login, is hidden by `.cvl-ck{display:none}`, and has no actual preferences. | blocked |
| Login layout, backdrop, typography and mobile reflow | pending | P2 | `CvLogin.tsx`; no paired rendering yet. | blocked |
| Google sign-in logo/button | pending | P2 | Chooser now reuses the vendored official `GoogleButton`, matching the email form. Login CSS excludes it so Google font, spacing, colors, logo proportions and focus styles survive. Browser checks outstanding. | blocked |
| Email login, signup, forgot password | pending | P1 | Firebase handlers exist; production account flow untested. | blocked |
| Validation/error messages and focus | pending | P2 | `LoginForm.tsx` and auth helpers; compare actual invalid/expired/email-taken cases. | blocked |
| Other SSO and work email | missing | P1 | Facebook, alternative methods and work-email controls disabled. Do not use SSO on the original during the audit. | blocked |
| Cookie consent dialog | differs | P2 | “Manage cookies” performs the same acceptance as “Accept all”; nonessential cookie claims are not backed by implementation. | blocked |
| Onboarding questions | missing | P2 | Signup routes directly into app; no onboarding flow found. | blocked |
| Logo/blog scope clarification | pending | P2 | Owner said “the log”; clarification requested. | blocked |

## Dashboard and library

| Screen / feature | Status | Severity | Evidence / next verification | Screenshots |
| --- | --- | --- | --- | --- |
| Main rail and collapse behavior | differs | P2 | `AppShell.tsx`: collapse button inert; several destinations route to Home. | blocked |
| Home hero and visual hierarchy | pending | P2 | Compare typography, gradient, spacing and responsive states. | blocked |
| Trial messaging | differs | P1 | Dashboard, Projects and editor advertise a nonexistent 30-day trial; violates free-only scope. | blocked |
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
| Rotation-aware resize | differs | P1 | `resizeBox` uses unrotated geometry. | blocked |
| Floating toolbar appearance | pending | P2 | Compare position, sizing, icons and focus behavior. | blocked |
| Ask Canva / element links / comments | missing | P1 | Toolbar displays unsupported toasts. | blocked |
| Lock persistence and protection | differs | P1 | Lock held in local Set; not saved, undoable, or respected by keyboard/edit/delete operations. | blocked |
| More menu / duplication / z-order | differs | P2 | Basic actions exist; inspect full menu and keyboard behavior. | blocked |
| Position panel / alignment | differs | P2 | Basic page alignment and two stacking controls only. | blocked |
| Layers panel | differs | P2 | Simple list inside Elements; no dedicated full layer management. | blocked |
| Guides and snapping | pending | P2 | Geometry unit tests pass; compare drag thresholds, zoom, rotation and multi-object behavior. | blocked |
| Multi-select / grouping / ungrouping | missing | P1 | Selection model is one element ID; no groups. | blocked |
| Copy / cut / paste | missing | P1 | No clipboard integration. | blocked |
| Keyboard shortcuts | differs | P2 | Undo/redo/duplicate/delete/nudge/Esc only; formatting, selection and tool shortcuts absent. | blocked |
| Context menu | missing | P2 | No editor-specific context-menu implementation. | blocked |
| Page background color | pending | P2 | Palette/custom color exist; compare interaction and exported result. | blocked |
| Add/delete/reorder/duplicate pages | missing | P1 | Add page shows single-page message; data model has no pages. | blocked |
| Page strip and grid view | missing | P1 | Static page 1 and no grid view. | blocked |
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
| Text wrapping, italic measurement and long words | differs | P1 | Whitespace is collapsed by layout and oversized words do not wrap; needs render parity. | blocked |

## Sharing, export and persistence

| Screen / feature | Status | Severity | Evidence / next verification | Screenshots |
| --- | --- | --- | --- | --- |
| Share menu layout and keyboard behavior | pending | P2 | UI present; many actions below are placeholders. | blocked |
| Access control / invitations / collaboration | missing | P1 | Static people/access controls; no sharing model or collaboration transport. | blocked |
| Public view link / copy link | differs | P1 | Copies local editor URL although designs exist only in this browser. | blocked |
| Download PNG/JPG/SVG | pending | P1 | Renderers implemented; real download/content checks outstanding. | blocked |
| PDF / PPTX / video / GIF export | missing | P1 | No export UI or implementations for these types. | blocked |
| Export pages / size / quality / transparency | missing | P1 | No controls; raster export fixed at 1× with opaque page fill. | blocked |
| Present mode and presenter view | differs | P1 | Opens bare SVG in another tab; no slide navigation or presenter controls. | blocked |
| Present and record | missing | P1 | Inert Share action. | blocked |
| Publish as website / link settings | missing | P1 | Inert Share action. | blocked |
| Google Drive / third-party export | missing | P1 | Inert Share action. | blocked |
| Autosave and save-state reporting | differs | P0 | localStorage only; quota/parse errors swallowed; cloud Saved icon unconditional. | blocked |
| Cloud sync / cross-device reopen | missing | P1 | Generic Firestore store exists but editor/dashboard only use `useLocal`. | blocked |
| Rename design | pending | P2 | Name input updates model; reload and accessibility checks outstanding. | blocked |
| Delete design | differs | P1 | Browser confirm + permanent removal; no trash recovery. | blocked |
| Duplicate design | missing | P1 | Element duplication exists; dashboard design duplication absent. | blocked |
| Template application | pending | P1 | Replaces current design while retaining ID; verify history, dimensions and naming. | blocked |

## Paid functionality to implement free

These are backlog items, not exceptions. Inventory must expand with actual logged-in observation; the list below does not claim complete coverage of Canva's current paid offering.

| Screen / feature | Status | Severity | Evidence / next verification | Screenshots |
| --- | --- | --- | --- | --- |
| Brand kits, brand fonts/logos/templates, brand controls | missing | P1 | Build own persisted implementation and licensed-font uploads. | blocked |
| Premium-equivalent template/element/media library | differs | P1 | Small original template set only; expand original/open-license catalog and filtering. | blocked |
| Background removal / photo editing / crop / filters | missing | P1 | Use free local/open implementations where practical; no service selected. | blocked |
| AI writing, generation, image editing and translation | missing | P1 | Needs provider/local-model architecture and resource budget; not waived for being paid in Canva. | blocked |
| Magic Resize / design adaptation / animation | differs | P1 | Basic geometric resize only; full adaptation and animation absent. | blocked |
| Video/audio editing and timeline | missing | P1 | Static design model only. | blocked |
| Docs / Sheets / Whiteboards / Websites / Email | missing | P1 | Dashboard labels do not provide those editors. | blocked |
| Content planner / scheduling / publishing integrations | missing | P1 | No planner, scheduler or provider integrations. | blocked |
| Teams / comments / approvals / version history | missing | P1 | No workspace, roles, collaboration or approval model. | blocked |
| Advanced export / reusable assets / bulk creation | missing | P1 | Requires data-model and renderer work. | blocked |
| Enterprise admin / SSO / provisioning / audit features | missing | P1 | Full logged-in scope includes these; identity/infrastructure requirements need specification. | blocked |

## Global quality

| Screen / feature | Status | Severity | Evidence / next verification | Screenshots |
| --- | --- | --- | --- | --- |
| 404 state | differs | P2 | Framework default; no app-specific not-found route. | blocked |
| Error boundaries / recovery | missing | P1 | No `error.tsx`; several local-storage failures ignored. | blocked |
| Loading states | differs | P2 | EditorLoader uses plain Loading text; no consistent state system. | blocked |
| Keyboard navigation / dialogs / focus return / contrast | pending | P1 | Requires real browser/a11y checks at both viewports. | blocked |
| Responsive logged-in layout / touch | pending | P1 | No actual 390px interaction checks yet. | blocked |
| Lint and repeatable browser checks | missing | P1 | No lint command; existing `scripts/shots.mjs` uses stale Download selectors and hard-coded `/workspace` output. | blocked |

## Change log

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
- Independent branding, generated/open-license assets, OFL font substitutes, and the existing disclaimer/footer remain intentional asset differences.
- Unavailable browser/network access is a blocker, not a parity exception. No missing functional row is waived.
- Need working browser + external connectivity, disposable mailbox access, and an authenticated original test session to finish observation. Paid features may require an owner-provided paid reference session or authorized captures; no trial or payment may be started under the current instructions.
- Need clarification of “the log.” AI hosting, durable media storage, realtime collaboration, publishing, and enterprise identity require architecture/provider decisions; implementation should remain free to end users.

**Completion: not achieved.** No row is marked match without the required evidence.
