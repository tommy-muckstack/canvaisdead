# Elements filter names and keyboard interaction

Date: 2026-10-16. PR [#55](https://github.com/tommy-muckstack/canvaisdead/pull/55), based on #54. Final verification is complete; production markup is unchanged and no original/clone parity match is claimed.

## What the native evidence established

The two filter/search cases in #54 stopped at `getByLabel("Color", { exact: true })`. Parent captures show the original comboboxes already have the correct **Color** and **Orientation** accessible names, both initially and with White/Landscape selected. Exact label-text lookup finds neither because the implicit label text includes the select options.

[Diagnostic run 38932575273](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38932575273), code `9b9b8dc2bd999ff76787b836fb161125eda752ed`, temporarily made labels explicit. That changed the exact label lookup but did not improve the observed accessibility tree or control geometry. Production markup was therefore restored byte-for-byte to #54. The final regression locates comboboxes by their existing exact accessible names. This is a test-locator correction, not a screen-reader naming defect.

## Final verification

[Run 38933635387](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38933635387) tests code `2fef0c479ab6238d3ad4dd3ccef39b033a0af318`, tree `824a2d847785b7b58777b013a826519fff76e055`. Clean install, lint, typecheck, **395 unit tests in 37 files**, and build pass. Native Chromium at 1440 × 900 and 390 × 844 reports:

| Partition | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Focused filters/library/editor/exports | 70 | 0 | 0 |
| Storage/handoff | 32 | 0 | 0 |
| General editor | 73 | 9 | 2 |
| **186 regression instances, no partition overlap** | **175** | **9** | **2** |

Eighteen separate parent capture flows pass. All eleven executable Elements instances pass; the existing mobile native-mouse drag case remains skipped because it cannot verify physical touch dragging. The second skip is the equivalent Uploads case. No newly failing scenario appears compared with the diagnostic run.

The original composition/search/empty-result/navigation assertions remain. Both filter scenarios pass at both widths, including exact accessible names, Tab order, native select keyboard changes without moving selected artwork, Clear filters, hiding controls out of the tab order, and retaining values/expanded state after visiting Text and returning to Elements.

The nine remaining failures cover backup alert scoping (both widths), clipboard PNG setup (both), empty guest-grid setup (both), desktop crop reopening, mobile nested-group editing and mobile Layers pointer/cancellation. These are unresolved verification failures, not nine established product regressions. The dependent stack stays unmerged.

## Retained comparison

Separate parent captures reach the fields independently of the failed label-text lookup. Both versions record default and White/Landscape states, accessibility snapshots, exact label/role matches, values, options, computed styles, geometry and viewport PNGs. All eight PNGs were inspected. **All four before/after pairs are pixel-identical.** The control measurements and accessibility snapshots are also exactly equal.

Desktop selects measure 131.5 × 36 CSS pixels at x=95/236.5, y=272. Mobile selects measure 131.5 × 44 at x=87/228.5, y=342. Both use 12px IsDead Plus Jakarta Sans, color rgb(14,19,24), 4px padding/radius and no shadow. Exact role/name lookup finds one control for each name before and after; exact label-text lookup finds zero throughout.

| Viewport/state | Before | After |
| --- | --- | --- |
| Desktop/default | [PNG](elements-filters-default-desktop-before.png) | [PNG](elements-filters-default-desktop-after.png) |
| Desktop/filtered | [PNG](elements-filters-filtered-desktop-before.png) | [PNG](elements-filters-filtered-desktop-after.png) |
| Mobile/default | [PNG](elements-filters-default-mobile-before.png) | [PNG](elements-filters-default-mobile-after.png) |
| Mobile/filtered | [PNG](elements-filters-filtered-mobile-before.png) | [PNG](elements-filters-filtered-mobile-after.png) |

[Raw final observations and diagnostic metadata](elements-filter-controls.json) retain both runs without embedding PNG bytes.

The public-runner workflow moves the filter scenarios into its focused partition and restores the parent's ElementsPanel only for separate baseline captures. No workflow permissions, secrets, dependencies, authentication, storage or billing settings change. Original comparison remains blocked by HTTP 403; catalog breadth, unavailable media, physical touch drag and broad parity remain unfinished.
