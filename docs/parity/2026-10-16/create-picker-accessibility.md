# Create picker keyboard and Units accessibility

## Observed failures

The completed parent [run 38905996524](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38905996524) fails the Create search/Escape scenario at both widths: after typing a search and pressing Escape, the dialog remains mounted. The component only handles the native dialog `cancel` event. A filled search input consuming Escape is the current hypothesis; the parent capture records its actual post-key state.

The custom-size scenario also stops at `getByLabel("Units", { exact: true })`. The wrapping label contains the select's option text. Give the select an explicit accessible name from the visible Units text and associate the existing dimension/conversion help. Retain the label wrapper and CSS layout.

## Change

- Handle non-composing Escape in the search field through the existing dismiss path. Prevent the search's default key action and stop propagation. Other controls retain native dialog cancellation, including the dimension fields. The existing unmount cleanup restores focus to the opener; dismissal also prevents delayed creation from navigating after closure.
- Name the units combobox from a visible span and describe it with the existing size help. Unit conversion, limits, locking, orientation and saving logic are unchanged.
- Retain all original search/create, dimension/save/reload/recent-size, storage-failure retry and delayed-save dismissal assertions. Add accessible-name/description and label-click focus checks plus native modal tab containment and Escape from empty search, a button and a dimension field.

All Create cases run in the focused CI job; the other jobs retain the remaining full-suite inventory. The separate parent build captures search and custom-size controls, DOM geometry, computed styles, accessibility snapshots and the first Escape result. It uses synthetic demo data and no production credentials or external design/media storage. No new service, dependency, billing, authentication or analytics changes.

## Verification

Local lint, typecheck, all 388 unit tests in 37 files and production build pass. Playwright discovers 176 regression instances, including 12 Create cases at both widths. Native desktop/mobile results and retained before/after captures are pending. The preceding stack has 30 unresolved browser failures, including four Create instances; this change does not establish that the remaining failures are fixed. Original/clone visual parity, full preset/editor coverage, physical-unit metadata and reference new-tab behavior remain incomplete. Keep the PR draft and unmerged until its results are recorded.
