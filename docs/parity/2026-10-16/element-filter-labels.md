# Elements filter names and keyboard interaction

Date: 2026-10-16. PR [#55](https://github.com/tommy-muckstack/canvaisdead/pull/55), based on #54. Verification in progress; product markup is restored and no parity match is claimed.

## What the native evidence established

The two filter/search cases in #54 stop at `getByLabel("Color", { exact: true })`. [Diagnostic run 38932575273](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38932575273), code `9b9b8dc2bd999ff76787b836fb161125eda752ed`, passes clean install, lint, typecheck, 395 unit tests and build. Its totals are 175 passed / 9 failed / 2 skipped of 186, plus 18 baseline capture flows.

Parent captures show the original comboboxes already have the correct **Color** and **Orientation** accessible names, both initially and with White/Landscape selected. Exact label-text lookup finds neither because the implicit label text includes the select options. The initial explicit-label diagnostic made that lookup succeed but did not improve the observed accessibility tree or control geometry. Production markup has therefore been restored, and the regression now locates comboboxes by their existing exact accessible names. This is a test-locator correction, not a claimed screen-reader naming defect.

## Functional verification

The original composition/search/empty-result/navigation assertions remain. Additional browser checks cover exact accessible names, Tab order, native select keyboard changes without moving selected artwork, Clear filters, hiding controls out of the tab order, and retaining values/expanded state after visiting Text and returning to Elements.

Separate parent captures reach the fields independently of the failed label-text lookup. Both versions record default and White/Landscape states, accessibility snapshots, exact label/role matches, values, options, computed styles, geometry and viewport PNGs at 1440px and 390px.

The final original-markup run is pending. The regression inventory remains 186 cases split into 70 focused, 32 storage and 84 general cases without overlap. The existing public-runner workflow moves the filter scenarios into its focused partition and restores the parent's ElementsPanel only for separate baseline captures. No workflow permissions, secrets, dependencies, authentication, storage or billing settings change. Original comparison remains blocked by HTTP 403; catalog breadth, unavailable media and physical touch drag remain unfinished.
