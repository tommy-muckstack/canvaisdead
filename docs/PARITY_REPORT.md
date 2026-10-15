# CanvaIsDead parity report

Updated: 2026-10-15. This focused branch starts from main at `eac12c93c2c90d993fe8e02bb08a9c417ca1e997` and fixes product naming and free-access messaging directly, independently of the earlier stacked parity PRs.

## Product requirements

- All functionality is free, including equivalents of paid features in the reference product. No trial, upgrade, paid-plan or checkout flow. Unimplemented features remain work, not paid-service exceptions.
- Every product label uses **CanvaIsDead**. The owner's latest correction also removes the original company's name from the visible footer; the independence/trademark disclaimer and source link remain.
- Logged-out scope is homepage and login/signup/recovery. Google and email only are the intended providers. Logged-in functionality remains fully in scope.
- Designs/media remain local. No new billable services, credential changes or payment changes. Existing hosting/authentication/analytics costs have not been verified.
- Small PRs, no merging by the agent. The requested tombstone icon is separately proposed in [PR #19](https://github.com/tommy-muckstack/canvaisdead/pull/19).

## Branch and evidence boundaries

The [full screen/feature inventory and earlier evidence](https://github.com/tommy-muckstack/canvaisdead/blob/f6be7d6d2b1ead10701b261d0679a590b5db5f1b/docs/PARITY_REPORT.md) remains in the separate parity stack. Its implementation notes refer to those unmerged draft PRs, **not deployed main or this focused branch**. In particular, this branch does not include the stack's local-save, backup, multi-page, presentation, export, auth-provider, analytics or icon implementations.

The earlier [PR #12](https://github.com/tommy-muckstack/canvaisdead/pull/12) proposed most copy corrections on top of other drafts. Main still contained the trial badges and original brand labels. This direct-to-main change makes those corrections independently reviewable and removes the remaining standalone original name from visible legal copy.

The owner's editor composite is reference evidence only: its panes have different widths and zoom levels. No controlled original/clone screenshot pair exists at 1440 × 900 or 390 × 844. Browser launches remain blocked by the previously documented macOS runtime failures, including escalated Chromium/Chrome and Firefox attempts. Live-site web retrieval also failed during this correction. Do not interpret source or HTTP checks as visual parity.

`differs` identifies observed differences; `missing` identifies absent functionality; `pending` means not verified and is not a completed match. Every broader row below links back to the detailed inventory above.

## Screen and feature status

| Screen / feature | Status | Severity | Current finding / correction | Screenshots |
| --- | --- | --- | --- | --- |
| Home / Templates / Projects trial badges | differs | P1 | Replace all “Try it free for 30 days” badges and their crown decorations with “Everything included.” Intentional free-product difference; rendering comparison pending. | blocked |
| Editor trial badge | differs | P1 | Replace 30-day trial copy with “Everything included.” | owner's composite before; after blocked |
| Dashboard hero | differs | P1 | “What will you create with CanvaIsDead today?” replaces the standalone original brand. | blocked |
| Dashboard / Projects / Templates labels | differs | P1 | Projects logo text, Popular on…, Discover…, and AI rail labels use CanvaIsDead. | blocked |
| Editor AI rail / floating toolbar / toast | differs | P1 | CanvaIsDead AI and Ask CanvaIsDead, including the unavailable-feature message. | blocked |
| Homepage copy / footer / metadata | differs | P1 | Full product name, ordinary create actions, free-access message, no original-company name in visible copy. Preserve independence disclaimer and source link. | blocked |
| Homepage layout / menus / illustrations / cookies | pending | P2 | Separate complete visual/behavior comparison still required. | blocked |
| Pricing / billing / sales navigation | differs | P1 | Remove paid cards, billing toggle, add-on promotion, sales CTAs and alternate price calculator. Legacy `/pricing` redirects home with Next.js base-path handling. | blocked |
| Tombstone mark / favicon | differs | P2 | Separate unmerged PR #19; not included in this copy-only branch. | generated asset in #19; browser blocked |
| Google/email login and signup / recovery | differs | P1 | Main still needs the provider/collage changes in [PR #11](https://github.com/tommy-muckstack/canvaisdead/pull/11); real account checks outstanding. | blocked |
| Guest sessions / sign-in data handoff | differs | P1 | Upstream #18 is present; server document adoption does not migrate browser design libraries. Local handoff work is separate and unpublished. | blocked |
| Dashboard quick create / search / profile / empty states | differs | P1 | Partial implementation; detailed inventory and browser audit outstanding. | blocked |
| Templates / premium-equivalent original assets | differs | P1 | Small original catalog; full browsing/filtering and asset coverage remain work. | blocked |
| Projects / duplicate / delete / recovery | differs | P1 | Listing exists; design duplication/trash and reliable local recovery remain separate work. | blocked |
| Editor chrome / panels / canvas / zoom / page strip | differs | P1 | Partial editor; proposed spacing and multi-page changes remain in separate drafts. | blocked |
| Text / rich formatting / lists / spacing / effects | differs | P1 | Basic text exists; rich formatting and many tools absent. | blocked |
| Selection / handles / snapping / layers / grouping | differs | P1 | Basic manipulation exists; rotation/locks and full multi-selection remain outstanding on this branch. | blocked |
| Keyboard shortcuts / context menu / text editing | pending | P1 | Requires direct browser comparison. | blocked |
| Share / access / links / collaboration | missing | P1 | UI placeholders do not provide working sharing or collaboration. | blocked |
| Download / present / website publishing | differs | P1 | Basic image downloads exist; richer local exports and presentations remain separate drafts. | blocked |
| Autosave / rename / backup / local persistence | differs | P0 | Main's storage failure/recovery gaps remain; separate save and backup PRs are not part of this branch. | blocked |
| Brand kit / photo editing / AI / animation / video | missing | P1 | Implementation work remains; no paid gates or licensed-service exception accepted. | blocked |
| Docs / Sheets / Whiteboards / Websites / other editors | missing | P1 | Dashboard labels do not supply these complete editors. | blocked |
| Teams / planner / publishing / admin | missing | P1 | Full feature work remains; extra identity providers explicitly excluded. | blocked |
| Errors / loading / 404 / keyboard / accessibility | pending | P1 | Full browser checks at both widths remain required. | blocked |

## This correction

- Compared the user's explicit naming/free-access requirements against all app/components/configuration text. No standalone capitalized original brand remains in product source strings. Internal import paths and the CSS theme identifier remain implementation names, not displayed labels.
- Apply neutral “Everything included” messaging on Home, Projects, Templates and the editor; remove trial-style marketing CTAs and the standalone pricing surface. Retain the footer and legal independence message with generic third-party attribution.
- Keep longer product labels wrapping in compact navigation and mobile auth headings. Resolve three existing lint findings in touched files: unused dashboard name/import and a click handler named like a React hook. No behavior changes from those cleanups.
- Preserve the parity branch preview exclusion from PR #5 so publishing this branch does not request an automatic Vercel preview. Production and other branches retain their defaults.
- Validation: changed-file ESLint (using PR #20's configuration), typecheck, 16 baseline unit tests and production build pass. Main still has no `npm run lint`; running that required command reports the missing script. The standalone lint setup remains in [PR #20](https://github.com/tommy-muckstack/canvaisdead/pull/20). Dependencies use the documented local overlay; a clean installation is not claimed.
- Production HTTP checks confirm corrected visible text on the homepage, Home, Projects, Templates and login; all return 200 with the local guest fixture. `/pricing` returns 307 to `/canvaisdead/`. Compiled editor code contains Ask CanvaIsDead and no 30-day trial string. These checks do not exercise browser layout or interactions.
- Before/after browser screenshots, real auth, and deployed behavior remain unverified. No merge or deployment is part of this correction.

## Remaining decisions / exceptions

Independent branding, original/open-license assets, Google/email-only authentication and local-only design storage are owner-directed exceptions to literal reference parity. The user-facing product name and free-access requirements take precedence over matching the reference's wording or paid offers. All other feature gaps remain implementation work. Working browser access and reference sessions/captures are still needed for visual sign-off.
