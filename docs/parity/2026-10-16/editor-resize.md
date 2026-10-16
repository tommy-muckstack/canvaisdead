# Resize and editable local copies

Date: 2026-10-16. [PR #61](https://github.com/tommy-muckstack/canvaisdead/pull/61), following the reviewed File-menu PR #60.

Replace the preset-only dropdown with searchable sizes, custom dimensions in px/in/mm/cm, ratio locking, dimension swapping, page selection and explicit Resize this design / Copy & resize actions. Multiple unique sizes create separate editable designs in Projects; one copy opens its editor. Batch copies use one existing IndexedDB transaction, reuse the File-menu retry/backup/navigation guards and preserve the original.

Whole-design resizing fits each page's composition proportionally and centers it. Text size, stroke width and corner radius scale with geometry; rotations, group spacing, locks, notes, image crop coordinates, flips and original image bytes remain intact. In-place resizing is one undo step. Invalid dimensions/page selections cannot commit, and cancellation discards input changes. No paid service, new storage provider, dependency, secrets or billing changes.

## Review findings and fixes

- Preset objects also contain an ID/name. Validate and sanitize targets to width/height, and assign only those dimensions to a resized design. A preset must never replace the document's identity.
- Valid older text can omit its font size, using the renderer's 32px default. Scale that effective default too; otherwise the artwork resizes while its text stays at the old size. The review fix materializes the scaled size and adds a regression, preserving the original input.
- Reviewed copy handling retains page notes, original image bytes, crops, flips and nested groups. Independent copies receive fresh document/page/element/group IDs; batch writes remain atomic. Recovery reuses pending IDs and navigation waits for local save acknowledgement.
- All prior File/export/storage assertions remain. No skips were added, assertions removed, live runs cancelled or unchanged failing runs retried.

## Verification

Six scenarios run at both 1440 × 900 and 390 × 844:

- Modal containment, initial/search focus, Tab boundaries, Escape/outside dismissal and unchanged saved artwork after cancellation.
- Unit conversion, ratio-locked custom resizing and preset resizing; literal all-page geometry, preserved identity/notes, exact one-step Undo/Redo, reload and real SVG export with original image bytes.
- Active text-editor commit before resizing; independent copies, centered proportional geometry, preserved source, crops/flips/locks, notes, disjoint IDs and reload.
- Multiple unique target sizes, preset/custom deduplication, current-page copies and actual Projects links.
- Invalid dimensions/area/page ranges block actions; selected-page copies work while selected-page in-place resizing is clearly unavailable.
- Injected native IndexedDB quota failure leaves the persisted library unchanged; a real backup retains the whole pending batch; Retry saves the same IDs once, then opens Projects and survives reload.

| Run | Result |
| --- | --- |
| [38956058799](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38956058799), code `fd16ca866d1997e18200244c4d787bfb8dc51396` | Clean install, lint, typecheck, build and **403 unit tests**; **210 browser passes / 0 failures / 2 existing touch-only skips**, plus two baseline capture flows. |
| [38957204229](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38957204229), code `c38e6495c6d0f034fb8324c5984ac911a31547e5` | Clean install, lint, typecheck, build and **404 unit tests**; **210 browser passes / 0 failures / 2 existing touch-only skips**, plus **two baseline capture flows passed**. All 12 Resize cases and the complete File/storage regressions pass. |

The reviewed code tree is `97bbe3106cbd2667f1ecceb8d92502b51b8c2319`. Local lint, typecheck, production build and **404 unit tests in 38 files** also pass. Nine Resize unit cases cover paint geometry, group proportions, page selection, exact history, legacy notes, size validation, preset ID isolation, implicit font sizing and copy inputs. The browser inventory has 212 cases without overlap: 122 focused, 32 storage and 58 general (56 executable, two existing physical-touch exclusions). Mouse-driven mobile checks do not establish physical-touch parity.

## Captures and computed styles

Eight PNGs form four before/after pairs. Six unique images were visually inspected; both closed-editor pairs are byte/pixel-identical. The old dropdown used immediate preset actions. The new dialog offers explicit apply/copy actions, searchable checkboxes and scrollable custom/page controls. The final review run reproduces all eight PNGs, computed metrics and accessibility snapshots exactly.

| State | Desktop before / after | Mobile before / after |
| --- | --- | --- |
| Closed | [Before](resize-closed-desktop-before.png) / [After](resize-closed-desktop-after.png) | [Before](resize-closed-mobile-before.png) / [After](resize-closed-mobile-after.png) |
| Opened | [Before](resize-opened-desktop-before.png) / [After](resize-opened-desktop-after.png) | [Before](resize-opened-mobile-before.png) / [After](resize-opened-mobile-after.png) |

The new panel is 360 × 720px at (99, 47) on desktop and (22, 92.5) on mobile, within each viewport. It uses 14px Plus Jakarta Sans, a 12px radius, 16px body padding and a 0 4px 24px shadow at 16% opacity. Mobile dimension fields and action buttons are at least 44px high. Document widths remain 1440px/390px; the original Resize-button geometry/styles remain unchanged. Custom and page controls scroll inside the panel rather than enlarging the document. [Raw styles, accessibility, hashes, pixel differences and run records](resize-controls.json).

Before captures restore PR #60's Editor, EditorLoader and CSS from `9ffcf3fe4fc9f4656fd02b5b1f535ac617852300` in a separate ephemeral build. Unused new modules remain available to typecheck. These are clone-revision comparisons, not direct original screenshots.

## Reference evidence and remaining scope

The official [resize guide](https://www.canva.com/en_au/help/resize-variantb/) describes custom/preset targets, ratio locking, multiple sizes, page selection and copying versus resizing. The official [dimension guide](https://www.canva.com/help/design-from-scratch/) describes units, limits and proportion locking. These capabilities remain free here even where the original requires a paid plan.

Exact original visuals and automatic layout rearrangement remain unverified: original account access remains challenge-blocked. This implementation fits proportions; it does not claim the original's semantic layout adaptation. The current document model has one size for all pages, so selected-page resizing in place is explicitly unavailable; selected-page copies work. Mixed page sizes, resize bundles, folder grouping, recent choices, broader preset/category coverage and source-account comparisons remain work, not waived requirements. Full original/feature parity remains incomplete.

## Merge review

The owner explicitly requested review and merge of acceptable open PRs. All open PRs at review start were #60 and #61. File-menu #60 is merged as `91f4772da5c6a4cfbb15740bd1fecd857e6689b1`, with the exact reviewed tree `99acd8858aa859bbe18155ce56d1258193f01053`. Resize follows that same tree, so retargeting it to main introduces no additional source changes. The implicit-font defect is fixed and all checks pass; #61 is approved for merge after recording this evidence. This final evidence commit changes documentation and captures only; the code tree tested above is retained.
