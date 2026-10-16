# Resize and editable local copies

Date: 2026-10-16. Native verification pending. Follow-up to File-menu PR #60.

Replace the preset-only dropdown with searchable sizes, custom dimensions in px/in/mm/cm, ratio locking, dimension swapping, page selection and explicit Resize this design / Copy & resize actions. Multiple unique sizes create separate editable designs in Projects; one copy opens its editor. Batch copies use one existing IndexedDB transaction, reuse the File-menu retry/backup/navigation guards and preserve the original.

Whole-design resizing fits each page's composition proportionally and centers it. Text size, stroke width and corner radius scale with geometry; rotations, group spacing, locks, notes, image crop coordinates, flips and original image bytes remain intact. In-place resizing is one undo step. Invalid dimensions/page selections cannot commit, and cancellation discards input changes.

The official [resize guide](https://www.canva.com/en_au/help/resize-variantb/) describes custom/preset targets, ratio locking, multiple sizes, page selection and copying versus resizing. The official [dimension guide](https://www.canva.com/help/design-from-scratch/) describes units, limits and proportion locking. These capabilities remain free here even where the original requires a paid plan.

Exact original visuals and automatic layout rearrangement remain unverified. This implementation fits proportions; it does not claim the original's semantic layout adaptation. The current document model has one size for all pages, so selected-page resizing in place is explicitly unavailable; selected-page copies work. Mixed page sizes, resize bundles, folder grouping, recent choices, broader preset/category coverage and source-account comparisons remain work, not waived requirements. No paid service, new storage provider or dependency.

Planned native verification at 1440px and 390px covers modal containment/focus/cancellation; unit and ratio edits; all-page geometry/history/reload/SVG export; active text commit and independent copies; multiple-size deduplication with selected pages in Projects; validation; and quota failure/backup/batch retry. Eight unit cases cover paint geometry, nondistorting group spacing, page selection, history, legacy notes, size limits, preset ID isolation and copy inputs. Paired screenshots, styles/accessibility and all run results will be retained.
