# Spacing panel stacking and native multiline text

## Observed defects and test targeting

The #45 native suite timed out in end-anchored text editing and spacing-preview dragging at both widths. The first investigation run, [38904771071](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38904771071), distinguishes two test assumptions from a product defect:

- At both widths, the center of the complete SVG text node hits the page background `rect` between painted lines. A locator requiring the text node itself to receive that event waits. Normal canvas clicks at exactly the same coordinates edit successfully; a painted-line center hits `tspan`. Both anchor/edit/SVG scenarios pass without an editor logic change.
- The mobile drag's intended artwork point (162.8, 486.1) hits a `span` in the open spacing popover. The final setup moves the selected text below the popover with normal keyboard nudges, then verifies an actual outside pointer-down on text. Spacing commit, movement and separate undo requirements remain.
- The native mobile controls screenshot shows the floating element toolbar covering the spacing popover's **Anchor text box** label. This is a product stacking defect: the floating toolbar's z-index 40 sits above the formatting bar's stacking context at 30, despite the child popover's z-index 60.

## Change and verification

Raise the formatting bar's stacking context to 60 while its spacing panel is open. This is the only product change. Existing coordinates, styles, actions, text editing, saved data and history remain intact. No dependency, service, secret, auth, billing or analytics change.

Retain normal pointer actions and all original anchored-growth, spacing-preview/drag/undo, lock and actual SVG-output assertions. Add native target measurements, editing on both the inter-line gap and a painted line, focus/content checks and a hit-test for the anchor label. No forced clicks or longer timeouts are introduced.

All eight text-spacing instances now run together in the selection/download CI job at 1440px and 390px; the complementary jobs retain the full 174-case inventory. Synthetic captures show spacing controls and edited text states. The first controls images are from commit `551400350d94a3a8e1e5358fb024fbb6516afc12`, whose application code is identical to parent #45; they provide the before baseline for the stacking change.

Local lint, typecheck, all 388 unit tests in 37 files and the production build passed for the investigation. Follow-up lint, typecheck and build pass; native verification of the stacking change is pending. The first selection/download job reports 29 passed and one mobile setup failure. Full original/clone visual comparison, paragraph formatting, advanced typography and exact reference metrics remain incomplete; no parity-match claim is made.
