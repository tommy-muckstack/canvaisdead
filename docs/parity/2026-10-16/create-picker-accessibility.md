# Create picker keyboard and Units accessibility

## Observed failures

The completed parent [run 38905996524](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38905996524) fails the Create search/Escape scenario at both widths: after typing a search and pressing Escape, the dialog remains mounted. The component only handles the native dialog `cancel` event. Parent captures in [run 38908341010](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38908341010) confirm that the first Escape clears the search and leaves the dialog open/focused on search. The changed version closes it and returns focus to Create.

The custom-size scenario also stops at `getByLabel("Units", { exact: true })`. The wrapping label's text is `Unitspxinmmcm`, although the native accessibility snapshot already names the combobox Units. Explicitly associate the visible Units text through `aria-labelledby`, making the label lookup reliable, and describe it with the existing dimension/conversion help. Retain the label wrapper and CSS layout; this is not a claim that the previous screen-reader name included the options.

The new modal keyboard test exposes another boundary issue at both widths: Shift+Tab from the first control leaves document focus rather than wrapping within the dialog. Add explicit boundary cycling over visible, enabled, tabbable controls while preserving native navigation between interior controls.

The keyboard contract follows the [W3C modal-dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): cycle Tab within the dialog, dismiss with Escape and restore the opener's focus. This is accessibility evidence, not an observation of the original product's current modal behavior.

## Change

- Handle non-composing Escape in the search field through the existing dismiss path. Prevent the search's default key action and stop propagation. Other controls retain native dialog cancellation, including the dimension fields. The existing unmount cleanup restores focus to the opener; dismissal also prevents delayed creation from navigating after closure.
- Wrap Tab from the last control and Shift+Tab from the first control within the dialog. Disabled and nonrendered controls are excluded, and the current DOM is read on each boundary key so search results and custom-size states are respected.
- Name the units combobox from a visible span and describe it with the existing size help. Unit conversion, limits, locking, orientation and saving logic are unchanged.
- Retain all original search/create, dimension/save/reload/recent-size, storage-failure retry and delayed-save dismissal assertions. Add accessible-name/description and label-click focus checks plus native modal tab containment and Escape from empty search, a button and a dimension field.

All Create cases run in the focused CI job; the other jobs retain the remaining full-suite inventory. The separate parent build captures search and custom-size controls, DOM geometry, computed styles, accessibility snapshots and the first Escape result. It uses synthetic demo data and no production credentials or external design/media storage. No new service, dependency, billing, authentication or analytics changes.

## Verification

Local lint, typecheck, all 388 unit tests in 37 files and production build pass; follow-up lint/typecheck/build also pass after boundary handling. Completed native [run 38909536035](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38909536035), code commit `a85410d7041ee5f2eec4a5f09b54254a851abb44`, independently passes clean install, lint, typecheck, 388 units and build.

| Native job | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Create / selection / downloads, 117001580223 | 42 | 0 | 0 |
| Storage / handoff, 117001580299 | 32 | 0 | 0 |
| General editor / library, 117001579852 | 74 | 26 | 2 |
| **All 176 regression instances** | **148** | **26** | **2** |

All 12 Create instances pass at both widths: the four parent failures and the two new focus cases now pass. Actual custom dimensions convert, lock/swap, create a 2112 × 1632 canvas, persist after reload and appear in recent sizes. Save-before-navigation, failed-save retry without duplication and closing during a queued write retain their original assertions. Eight separate parent capture flows pass and are excluded from the regression total. No previously passing scenario appears in the final failure list.

The first run totals 146 passed, 28 failed and two skipped. Its focused job passes 40 of 42 cases: all ten original Create instances pass, while the two new focus-boundary cases expose the issue above. Its general 26 failures persist in the final run. They include known test/fixture problems and unresolved editor/library interactions, not 26 established product regressions. The earlier [merge review](native-merge-review.md) describes those broader findings; its four Create failures are resolved by this follow-up.

Original/clone visual parity, full preset/editor coverage, physical-unit metadata, mobile category auto-scrolling, full touch behavior and reference new-tab behavior remain incomplete. Mobile Custom size opens correctly, but its selected category is outside the initially visible horizontal category strip. No reference match or whole-stack readiness claim is made. The PR stays draft and unmerged.

## Retained native captures

| Viewport and state | Before | After |
| --- | --- | --- |
| 1440 × 900 search | [Before](create-search-desktop-before.png) | [After](create-search-desktop-after.png) |
| 1440 × 900 dimensions | [Before](create-custom-desktop-before.png) | [After](create-custom-desktop-after.png) |
| 390 × 844 search | [Before](create-search-mobile-before.png) | [After](create-search-mobile-after.png) |
| 390 × 844 dimensions | [Before](create-custom-mobile-before.png) | [After](create-custom-mobile-after.png) |

[Styles, geometry, accessibility snapshots and keyboard states](create-picker-controls.json) come from native job 117001580223 in run 38909536035. The before build restores the parent component at `010ac5a4a54f334a1603c7d76f6cb6c5a7aaaffd`; after uses `a85410d7041ee5f2eec4a5f09b54254a851abb44`. All eight PNGs were visually inspected. Dialog and input geometry/styles match exactly across each pair. The desktop dialog is 960 × 731 CSS px with 16px corners; mobile is 374 × 821 with 12px corners. Fields remain 44px tall with 16px type. Whole screenshots can differ in demo recent-size order or the dimmed background; no whole-image identity or original-product parity claim is made.

The recorded search-control pixel regions are identical. Custom-field regions retain small border-paint differences: 120 pixels on desktop (maximum channel difference 2/255) and eight on mobile (1/255), with unchanged measured geometry/styles. These differences are retained in the evidence rather than normalized away; their rendering cause is not established.

The final keyboard measurements show first Escape returning focus to Create at both widths. Parent Shift+Tab leaves the dialog with `BODY` active; after, it reaches the last preset button, and Tab wraps to Close Create a design. The unchanged native cancel path also passes Escape from the close button and dimension field.
