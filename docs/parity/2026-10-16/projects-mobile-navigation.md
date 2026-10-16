# Reachable Projects navigation and content on mobile

Date: 2026-10-16. PR [#52](https://github.com/tommy-muckstack/canvaisdead/pull/52), based on #51. **The navigation obstruction and clipped-badge review finding are fixed and verified.** Overall Projects parity remains **differs**.

## Result

At narrow widths, Projects now gives the free-access badge a separate row, constrains the main flex item, wraps the filter row and lets card tracks shrink below their usual 210px minimum. In populated and empty mobile Projects, the former 475px inner width now equals the 334px scrollport. The badge fits at x=191–354 inside the 390px viewport. All projects and Trash receive pointer events, and cards/search/backup actions/filter labels stay within the visible horizontal bounds.

Desktop rules are unchanged. All three desktop before/after pairs are pixel-identical. This fixes reachability and overflow; it does not implement the existing placeholder filter controls or establish original visual parity.

## Final verification

Tested code `b4573f4708b1b40a09510a66b746cf4e9d8b4f43`, tree `be71d5c1f3348251c4d5b801a1954ddd04a29734`. [Completed run 38926581623](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38926581623) passes clean install, lint, typecheck, **395 unit tests in 37 files**, and production build. Local lint/typecheck/build passed; the final fixture-only wait also passes local lint/typecheck and the native build.

| Native Chromium job | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Focused library/editor/exports, 117059550018 | 66 | 0 | 0 |
| Storage/handoff, 117059550205 | 32 | 0 | 0 |
| General editor, 117059549828 | 70 | 14 | 2 |
| **All 184 regression instances** | **168** | **14** | **2** |

Sixteen separate baseline capture flows also pass, excluded from the 184. All ten library instances pass at desktop/mobile: navigation and hit targets, empty-state Create dialog/Escape focus return, resize transitions at 320/820/821/1440/390px, rename/copy/Trash/Undo/restore/confirmed deletion/persistence, keyboard dismissal/validation/search, and expired-Trash cleanup. The existing downstream assertions remain.

The remaining fourteen failures were already present in the initial #52 run: backup alert, clipboard fixture, guest setup, Elements filters/drag, crop, nested groups, Layers and upload placement/queued undo. The intermittent mobile Templates scenario passes again; its cause is not established and this CSS change is not claimed to fix it. These failed instances are not fourteen proven product regressions. The dependent stack remains unmerged.

## Screenshots and measured layout

Twelve original PNGs from job 117059550018 were retained and inspected. [Computed styles, hit targets, scroll widths, accessibility and pixel counts](library-fit-controls.json).

| View | Desktop before / after | Mobile before / after |
| --- | --- | --- |
| Populated Projects | [Before](library-fit-projects-desktop-before.png) / [After](library-fit-projects-desktop-after.png) | [Before](library-fit-projects-mobile-before.png) / [After](library-fit-projects-mobile-after.png) |
| Empty All projects | [Before](library-fit-projects-empty-desktop-before.png) / [After](library-fit-projects-empty-desktop-after.png) | [Before](library-fit-projects-empty-mobile-before.png) / [After](library-fit-projects-empty-mobile-after.png) |
| Empty Trash | [Before](library-fit-trash-desktop-before.png) / [After](library-fit-trash-desktop-after.png) | [Before](library-fit-trash-mobile-before.png) / [After](library-fit-trash-mobile-after.png) |

The parent is #51 at `847d62dbf29654e6bfb09b79b4547c8eb160cb9a`. Parent Trash uses direct navigation because its mobile link is covered; changed captures follow the actual link. Empty Projects is reached by moving all three demo designs to Trash through the UI. Capture helpers wait for loaded cards and post-deletion status focus, then return the pane to its scroll origin before header measurements. They do not force clicks or suppress pointer interception.

Mobile populated screenshots contain different demo-card ordering from timestamp-based seeding. Their changed-pixel count includes that content difference; it is not a pure layout-difference metric. All three desktop pairs have zero changed pixels.

## Review and intermediate evidence

- The initial badge-row-only change `5debc7047cd553fa94ffa420344b94b31ce6948f` fixed link interception but moved the badge to x=332–495 in populated mobile Projects. [Retained failing screenshot](library-projects-mobile-after.png) and [initial metrics](library-layout-controls.json) preserve that P2 finding. The final constrained layout above resolves it.
- [Run 38924470313](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38924470313) confirmed the width fix and passed 65/66 focused instances. Deleting the last card focused the lower status region and scrolled header links to y=-116; the new empty-state test incorrectly expected them to remain on screen. Capture setup now waits for that focus and returns to the top; product focus behavior is unchanged.
- [Run 38925535950](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38925535950) passed all 66 focused cases but one parent capture counted cards before route data loaded. The helper now waits for the first card. The final run above passes all sixteen capture flows. No unchanged run was retried to hide failures.

Only production changes are scoped mobile Projects CSS. No storage, auth, analytics, service, dependency or billing changes. Folder/star/shared-project/filter functionality and original comparisons remain unfinished. Independent [#53 public-reference evidence](https://github.com/tommy-muckstack/canvaisdead/pull/53) confirms original homepage/login HTTP 403 challenges; it does not provide a Projects reference.
