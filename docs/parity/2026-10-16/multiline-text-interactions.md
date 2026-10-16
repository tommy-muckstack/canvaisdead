# Spacing panel stacking and native multiline text

## Observed defects and test targeting

The #45 native suite timed out in end-anchored text editing and spacing-preview dragging at both widths. The first investigation run, [38904771071](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38904771071), distinguishes two test assumptions from a product defect:

- At both widths, the center of the complete SVG text node hits the page background `rect` between painted lines. A locator requiring the text node itself to receive that event waits. Normal canvas clicks at exactly the same coordinates edit successfully; a painted-line center hits `tspan`. Both anchor/edit/SVG scenarios pass without an editor logic change.
- The mobile drag's intended artwork point (162.8, 486.1) hits a `span` in the open spacing popover. The final setup moves the selected text below the popover with normal keyboard nudges, then verifies an actual outside pointer-down on text. Spacing commit, movement and separate undo requirements remain.
- The native controls screenshots show the floating element toolbar covering **Line spacing** on desktop and **Anchor text box** on mobile. This is a product stacking defect: the floating toolbar's z-index 40 sits above the formatting bar's stacking context at 30, despite the child popover's z-index 60.

## Change and verification

Raise the formatting bar's stacking context to 60 while its spacing panel is open. This is the only product change. Existing coordinates, styles, actions, text editing, saved data and history remain intact. No dependency, service, secret, auth, billing or analytics change.

Retain normal pointer actions and all original anchored-growth, spacing-preview/drag/undo, lock and actual SVG-output assertions. Add native target measurements, editing on both the inter-line gap and a painted line, focus/content checks and a hit-test for the anchor label. No forced clicks or longer timeouts are introduced.

All eight text-spacing instances now run together in the selection/download CI job at 1440px and 390px; the complementary jobs retain the full 174-case inventory. Synthetic captures show spacing controls and edited text states. The first controls images are from commit `551400350d94a3a8e1e5358fb024fbb6516afc12`, whose application code is identical to parent #45; they provide the before baseline for the stacking change.

Local lint, typecheck, all 388 unit tests in 37 files and the production build passed for the investigation. Follow-up lint, typecheck and build pass. Completed native [run 38905996524](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38905996524), code commit `210ff1466ef20e7f0df2086b002906814d2c12a0`, independently passes clean install, lint, typecheck, all 388 units and production build.

| Native job | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Selection/download, 116989592591 | 30 | 0 | 0 |
| Storage/handoff, 116989592315 | 32 | 0 | 0 |
| Editor/library, 116989591963 | 80 | 30 | 2 |
| **All 174 regression instances** | **142** | **30** | **2** |

All eight text-spacing instances pass, including panel-label hit testing, numeric/sliding preview and cancellation, normal double-clicks between lines and on a painted line, anchored growth, outside-click commit/drag with separate undo, lock behavior and actual downloaded SVG content. Six separate baseline capture flows pass and are not counted in the regression total. The four failing spacing instances from #45 now pass; no new failed scenario appears in the final run.

The first investigation run reported 140 passed, 32 failed and two skipped: its selection/download job had 29 passes and the one mobile setup failure described above. The general job also had an intermittent mobile Templates-opening timeout, on unchanged application code. That scenario passes in the final run; its intermittent cause remains uninvestigated. The remaining 30 failures include test/fixture problems and unresolved interactions; they are not 30 established regressions. See the [current merge review](native-merge-review.md).

## Retained native evidence

| Viewport | Before | After | Edited four-line text |
| --- | --- | --- | --- |
| 1440 × 900 | [Controls](spacing-desktop-before.png) | [Controls](spacing-desktop-after.png) | [End anchor](spacing-desktop-edited.png) |
| 390 × 844 | [Controls](spacing-mobile-before.png) | [Controls](spacing-mobile-after.png) | [End anchor](spacing-mobile-edited.png) |

The controls screenshots confirm that the panel covers the floating toolbar, exposing both labels. The canvas, text, selection bounds, font and tracking are unchanged between the controls captures. Adding two lines retains the selection's lower edge at approximately 435.110 CSS px on desktop and 512.638 CSS px on mobile. The changed captures hit-test the anchor legend successfully at both widths. The edited captures have no open panel; their false `anchorLabelVisible` value therefore describes absence, not obstruction. [Computed styles, geometry and pointer targets](spacing-interactions.json) retain run/commit provenance without screenshot payloads.

Full original/clone visual comparison, paragraph formatting, advanced typography and exact reference metrics remain incomplete; no parity-match claim is made. The dependent stack remains unmerged after the owner's conditional merge review because the remaining browser failures need triage.
