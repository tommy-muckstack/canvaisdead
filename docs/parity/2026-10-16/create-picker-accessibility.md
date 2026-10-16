# Create picker keyboard and Units accessibility

## Observed failures

The completed parent [run 38905996524](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38905996524) fails the Create search/Escape scenario at both widths: after typing a search and pressing Escape, the dialog remains mounted. The component only handles the native dialog `cancel` event. Parent captures in [run 38908341010](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38908341010) confirm that the first Escape clears the search and leaves the dialog open/focused on search. The changed version closes it and returns focus to Create.

The custom-size scenario also stops at `getByLabel("Units", { exact: true })`. The wrapping label's text is `Unitspxinmmcm`, although the native accessibility snapshot already names the combobox Units. Explicitly associate the visible Units text through `aria-labelledby`, making the label lookup reliable, and describe it with the existing dimension/conversion help. Retain the label wrapper and CSS layout; this is not a claim that the previous screen-reader name included the options.

The new modal keyboard test exposes another boundary issue at both widths: Shift+Tab from the first control leaves document focus rather than wrapping within the dialog. Add explicit boundary cycling over visible, enabled, tabbable controls while preserving native navigation between interior controls.

## Change

- Handle non-composing Escape in the search field through the existing dismiss path. Prevent the search's default key action and stop propagation. Other controls retain native dialog cancellation, including the dimension fields. The existing unmount cleanup restores focus to the opener; dismissal also prevents delayed creation from navigating after closure.
- Wrap Tab from the last control and Shift+Tab from the first control within the dialog. Disabled and nonrendered controls are excluded, and the current DOM is read on each boundary key so search results and custom-size states are respected.
- Name the units combobox from a visible span and describe it with the existing size help. Unit conversion, limits, locking, orientation and saving logic are unchanged.
- Retain all original search/create, dimension/save/reload/recent-size, storage-failure retry and delayed-save dismissal assertions. Add accessible-name/description and label-click focus checks plus native modal tab containment and Escape from empty search, a button and a dimension field.

All Create cases run in the focused CI job; the other jobs retain the remaining full-suite inventory. The separate parent build captures search and custom-size controls, DOM geometry, computed styles, accessibility snapshots and the first Escape result. It uses synthetic demo data and no production credentials or external design/media storage. No new service, dependency, billing, authentication or analytics changes.

## Verification

Local lint, typecheck, all 388 unit tests in 37 files and production build pass. Playwright discovers 176 regression instances, including 12 Create cases at both widths. The first focused native job passes 40 of 42 cases: all ten original Create instances now pass, including the unit-conversion/save/reload tail, while both new focus-boundary cases expose the issue above. Eight separate parent capture flows pass. Final native results and retained before/after captures are pending. Original/clone visual parity, full preset/editor coverage, physical-unit metadata and reference new-tab behavior remain incomplete. Keep the PR draft and unmerged until its results are recorded.
