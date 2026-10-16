# Canvas drop placement and queued insertion

Date: 2026-10-16. PR [#54](https://github.com/tommy-muckstack/canvaisdead/pull/54), based on #52. Product drop handlers are unchanged; this corrects verification of delivered coordinates.

## Native diagnostic evidence

[Run 38929453900](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38929453900), code `c7eb24192dab8dbefe93df54bade1d891142bc89`, tree `677d494137e97135a9669ee1a3635ddd06c36919`, retained all prior assertions. Clean install, lint, typecheck, 395 unit tests and build pass. Browser results remain 168 passed / 14 failed / 2 skipped, plus 16 passing baseline capture flows. Four observed scenarios establish that Chromium delivered integer coordinates despite fractional requests. Both native desktop drops have `isTrusted=true`; queued synthetic drops have `isTrusted=false`.

| Scenario | Requested client point | Delivered client point | Persisted design center |
| --- | --- | --- | --- |
| Desktop Elements cloud | 666, 346.5 | 666, 346 | 480, 323.04 |
| Desktop original upload | 716, 402.75 | 716, 402 | 576, 430.56 |
| Desktop queued upload 1 | 616, 346.5 | 616, 346 | 384, 323.04 |
| Desktop queued upload 2 | 1116, 515.25 | 1116, 515 | 1344, 647.52 |
| Mobile queued upload 1 | 136.4, 455.025 | 136, 455 | 381.45695364238406, 323.841059602649 |
| Mobile queued upload 2 | 287.4, 505.9875 | 287, 505 | 1341.4569536423842, 641.7218543046357 |

Projecting every persisted center through the browser's SVG `getScreenCTM()` captured at drop time gives exactly the delivered client point on both axes. The discrepancy is in the tests' requested-fraction expectations; no production placement defect is demonstrated. The listener observes before React handles the event without replacing or mutating it. It records bounds/viewBox/transform, transfer types and centers, without source media bytes.

## Corrected verification

Assertions now project persisted artwork through the observed SVG transform and check both axes against the delivered event within 0.005 CSS px. They also require the exact number and type of drop events and distinguish trusted native drops from synthetic queued events. Source-byte equality and group membership remain checked.

Native desktop upload and Elements flows now include Undo, Redo and reload. The queue case undoes both additions independently to an empty canvas, redoes them in order and reloads the exact saved elements. All four exercised drop instances pass in the follow-up native run, including the previously unreached mobile history tail. Local lint/typecheck/build also pass.

## Completed follow-up

[Run 38930488027](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38930488027), code `046d0178b41d553867da5e719c8800f6f2931623`, tree `ac27dca344cb0a3762a61de0ae750fab90784f6d`. Clean install, lint, typecheck, **395 unit tests in 37 files** and production build pass.

| Native regression partition | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Focused editor/exports/library | 66 | 0 | 0 |
| Storage/recovery/handoff | 32 | 0 | 0 |
| General editor | 73 | 11 | 2 |
| **All 184 instances** | **171** | **11** | **2** |

Sixteen baseline capture flows pass separately. All 19 executable Uploads cases pass; its mobile native mouse case is skipped. Elements has seven passes, two existing filter-label failures and one mobile mouse-drag skip. The three resolved placement failures are explained by observed event coordinates, not product fixes. There is no newly failing scenario against the diagnostic run.

The eleven remaining failures are: backup alert lookup (both widths), clipboard image fixture (both), Elements filter lookup (both), guest setup (both), desktop crop reopening, mobile nested-group interaction and mobile Layers pointer/cancel flow. These are failed test instances, not eleven established product defects; their downstream assertions still require verification. The dependent stack remains unmerged.

## Retained captures

These are before/after **test-correction** captures from the diagnostic and follow-up code commits. Product source is identical. They show the clone's placement state before history checks, not original/clone parity or the post-reload state. Passing assertions establish the history/reload result.

| Scenario | Before | After |
| --- | --- | --- |
| Native Elements, 1440×900 | [Before](canvas-drop-element-native-desktop-before.png) | [After](canvas-drop-element-native-desktop-after.png) |
| Native upload, 1440×900 | [Before](canvas-drop-upload-native-desktop-before.png) | [After](canvas-drop-upload-native-desktop-after.png) |
| Queued uploads, 1440×900 | [Before](canvas-drop-upload-queued-desktop-before.png) | [After](canvas-drop-upload-queued-desktop-after.png) |
| Queued uploads, 390×844 | [Before](canvas-drop-upload-queued-mobile-before.png) | [After](canvas-drop-upload-queued-mobile-after.png) |

All eight PNGs were inspected. The three desktop pairs are pixel-identical. The mobile pair differs at two pixels outside the canvas (x=6, y=214–215); the cause is unestablished. Drop metrics and persisted centers are identical across both runs. [Raw observations, native verification and pixel comparison](canvas-drop-controls.json) preserve the evidence.

## Limits

Physical touch dragging remains unverified and the two mouse-drag mobile cases remain explicitly skipped. Synthetic mobile drops test asynchronous insertion and geometry only. No new zoom/pan, cross-browser or original/clone interaction equivalence is established. Original public capture attempts remain blocked by HTTP 403; no parity row is marked match. The broader editor failures still require separate work. No production code, authentication, storage, dependency or billing setting changed.
