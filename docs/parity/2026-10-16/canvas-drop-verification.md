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

Native desktop upload and Elements flows now include Undo, Redo and reload. The queue case undoes both additions independently to an empty canvas, redoes them in order and reloads the exact saved elements. These checks are not yet claimed as passing: the follow-up native run is pending. Local lint/typecheck/build pass.

## Limits

Physical touch dragging remains unverified and the two mouse-drag mobile cases remain explicitly skipped. Synthetic mobile drops test asynchronous insertion and geometry only. No new zoom/pan, cross-browser or original/clone interaction equivalence is established. Original public capture attempts remain blocked by HTTP 403; no parity row is marked match. The broader editor failures still require separate work. No production code, authentication, storage, dependency or billing setting changed.
