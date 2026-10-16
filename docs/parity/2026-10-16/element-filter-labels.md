# Elements filter labels and keyboard interaction

Date: 2026-10-16. Based on #54. Verification in progress; no parity match claimed.

Both viewport instances of the filter/search regression stop at the exact Color label in completed run 38930488027. The current label wraps the select and every option. This change explicitly associates each select with its visible Color or Orientation text using an instance-specific ID; the selected option remains the control value. Options, filtering logic and layout CSS are unchanged.

The original composition/search/empty-result/navigation assertions remain. Additional browser checks cover exact accessible names, Tab order, native select keyboard changes without moving selected artwork, Clear filters, hiding controls out of the tab order, and retaining values/expanded state after visiting Text and returning to Elements.

Separate parent captures reach the old controls independently of the failing exact-label lookup. Both versions record initial and selected White/Landscape states, accessibility snapshots, label matches, values, options, computed styles, geometry and viewport PNGs at 1440px and 390px. These will distinguish native naming behavior from locator behavior and verify visual impact.

Local lint, typecheck and build pass. The regression inventory has 186 cases split into 70 focused, 32 storage and 84 general cases without overlap. Native checks are pending. The existing public-runner workflow moves the two filter scenarios into its focused partition and restores the parent's ElementsPanel only for separate baseline captures. No workflow permissions, secrets, dependencies, auth, storage or billing settings change. Original comparison remains blocked by HTTP 403; catalog breadth, unavailable media and physical touch drag remain unfinished.
