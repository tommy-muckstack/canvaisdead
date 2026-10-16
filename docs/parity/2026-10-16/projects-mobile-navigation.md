# Reachable Projects navigation on mobile

Date: 2026-10-16. PR [#52](https://github.com/tommy-muckstack/canvaisdead/pull/52). Parent: #51, `847d62dbf29654e6bfb09b79b4547c8eb160cb9a`. Status: **differs; overflow correction awaiting native verification**.

## Follow-up to the review

Constrain the mobile Projects flex item, wrap its filter row and let its card grid shrink below 210px on narrow screens. The status badge keeps its separate row. Extended native checks measure the actual scroll container and every badge, search field, backup action, filter, card and card menu trigger, including resize transitions at 320/820/821/1440/390px. Add the real empty All projects state by moving all demo designs to Trash, then check its Create dialog and Escape focus return. Fresh results and twelve captures are pending; the initial failure evidence below is retained rather than overwritten.

The first correction run, [38924470313](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38924470313), passes both resize cases and confirms mobile Projects now has client/scroll width 334px and the badge at x=191–354. Its focused job passes 65/66: the new mobile empty-state case checks header hit targets after deleting the last card focuses the lower status region and scrolls the header above the viewport (All projects y=-116). The capture helper now waits for that focus and explicitly returns the scroll pane to the origin before comparing header targets; no hit-test assertions or product focus behavior were removed. A new run is required for the remaining Create-dialog assertions.

## Change and observed behavior

The parent native run reports the “Everything included” badge intercepting the mobile Trash link. At widths up to 820px, this change gives the badge a normal-flow row above the view links. The original desktop CSS is unchanged.

All eight library test instances now pass: normal Projects/Trash navigation and keyboard return, rename/copy/trash/undo/restore/permanent deletion, keyboard menu dismissal/rename validation/search, and expired-Trash cleanup. The alert selector is scoped to its form to exclude the Next.js route announcer; no downstream assertions were removed.

**Visual review found a regression the new test misses.** In populated mobile Projects, `.cx-proj__main` remains 475px wide inside the 334px visible content area. Moving the badge into that flex item shifts it from x=202–365 to x=332–495 in a 390px viewport: 105px of the badge lies beyond the viewport and its text is visibly clipped. Both navigation links work, but the layout is not ready to merge. The document-width assertion passes because the outer page is only 390px wide while the inner container overflows. Constrain the mobile content and verify the badge, filters and project cards fit inside the visible scrollport before signing off. The 475px content width already existed in the parent; the newly clipped badge is introduced by this rule.

Empty mobile Trash does not have that width overflow: its badge fits at x=191–354. Both mobile view links move down 58px and receive pointer events after the change. Desktop Projects and Trash are pixel-identical to their respective parent captures.

## Native verification

Tested code: `5debc7047cd553fa94ffa420344b94b31ce6948f`, tree `3ce4792b121bb6568c9d021a8060c34c554e32f9`.

[Completed run 38921663275](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38921663275), Chromium at 1440 × 900 and 390 × 844:

| Job | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Focused library/editor/export, 117042851699 | 64 | 0 | 0 |
| Storage/handoff, 117042852175 | 32 | 0 | 0 |
| General editor, 117042852450 | 69 | 15 | 2 |
| **All 182 regression instances** | **165** | **15** | **2** |

Sixteen separate baseline capture flows also pass; they are excluded from the 182. Clean install, lint, typecheck, **395 unit tests in 37 files**, and production build pass. Local lint/typecheck/build also passed on the matching dependency overlay. No retry was used to hide failures.

Four library failures from #51 resolve. The previously intermittent mobile Templates scenario fails again at `editor-shell.spec.ts:9`; its cause is unconfirmed. The remaining fourteen failures were also present in #51. Other unresolved flows include upload placement/queued undo, crop, nested groups and Layers. These counts do not imply fifteen confirmed product defects.

## Retained evidence

Original PNG bytes from job 117042851699 were inspected. Computed geometry/styles and accessibility snapshots: [library-layout-controls.json](library-layout-controls.json).

| View | Desktop before / after | Mobile before / after |
| --- | --- | --- |
| Populated Projects | [Before](library-projects-desktop-before.png) / [After](library-projects-desktop-after.png) | [Before](library-projects-mobile-before.png) / [After — clipped badge](library-projects-mobile-after.png) |
| Empty Trash | [Before](library-trash-desktop-before.png) / [After](library-trash-desktop-after.png) | [Before](library-trash-mobile-before.png) / [After](library-trash-mobile-after.png) |

Parent empty-Trash captures navigate directly to the route because the mobile link is obstructed. Changed captures use the actual Trash link. This does not establish that the parent's link works. Empty All projects was not captured or specifically verified. No original/clone visual-match claim is made.

Only production change: one mobile Projects CSS rule. No storage, auth, analytics, service, dependency or billing changes. Folder/star/shared-project functionality, original reference comparisons and other parity rows remain unfinished. See the [current merge review](native-merge-review.md#review-of-all-17-open-prs-through-52).
