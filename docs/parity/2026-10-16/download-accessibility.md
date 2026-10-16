# Download controls and native export verification

Date: 2026-10-16. Scope: the Download panel's label/control relationships and the native export flows blocked by exact label lookups in the merge review. Stacked on #42; no merge or deployment.

## Evidence and change

[Parent run 38892649896](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38892649896) finishes with 32 passing storage checks plus 77 passing, 55 failing and two skipped editor/library checks. At both widths, the Download regression cannot locate `File type` by its exact label. Other export scenarios stop at the same lookup. The old wrapping labels contain the select options, and the slider labels contain their changing outputs/dimensions. This is evidence of a label-targeting failure, not proof that exports themselves are broken or that every screen reader announces the wrong name.

File type, Size, Quality, Select pages and Page numbers now use separate visible labels explicitly linked to unique control IDs. Size/quality outputs remain visible, slider values have readable units, and format guidance, dimensions and page validation are associated as descriptions. This follows [W3C WAI's explicit-label guidance](https://www.w3.org/WAI/tutorials/forms/labels/). Existing layout classes and native inputs remain in use.

The browser regression retains exact label lookups and now checks exact control names, dynamic descriptions, keyboard slider values, and a real JPG's signature, dimensions and opaque background. Existing assertions verify selected-page SVG ZIP contents, omission of private notes, transparent PNG pixels, PDF page count/size, remembered preferences, Escape and focus return. Other targeted flows verify cropped/flipped source pixels, text spacing, page changes and original uploads through exports.

## Verification

- Local lint, typecheck, **384 unit tests in 36 files**, and production build pass with the documented dependency overlay. Native CI performs a separate clean install.
- CI partitions the same 166 instances into 32 storage, 16 download and 118 complementary editor/library cases. No scenario is removed. Download failures print bounded synthetic demo context.
- First native [run 38894957721](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38894957721), downloads job 116953104789: **11 passed, 5 failed**. The complete SVG ZIP/JPG/transparent PNG/PDF workflow, normal artwork/Projects/Present, cropped exports, rotated flips and uploaded originals pass at both widths; desktop text-layout export also passes. The five remaining page/text cases stop before Download opens. Mobile text double-click is intercepted by the floating toolbar; the other snapshots remain in text-editing/spacing setup. These remain open editor work, not a green full-suite claim.
- Completed follow-up [run 38896077575](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38896077575), tested commit `395535d7f589095e205d1245be595803d1115e26`: clean install, lint, typecheck, **384 unit tests** and build pass. Storage is **32/32**; downloads are **11 passed / 5 failed**; complementary editor/library checks are **78 passed / 38 failed / 2 skipped**. Total: **121 passed / 43 failed / 2 skipped** out of 166, matching the first run's totals. The separate before-capture flows both pass and are not counted as regression passes.
- Inspected and retained native before/after captures below. File type and Select pages are 40px high, with 12px horizontal padding, 8px radii and 14px/400 Plus Jakarta Sans; widths are 348px/342px respectively. The panel and focused page-number field fit both viewports. Before and after PNG bytes are identical at each width, and measured visual styles are unchanged. This is an accessibility change without a layout change.
- The capture build uses the actual parent DownloadPanel from `75160a9d44bbbcd2f8c899cb1fe74098f48939f6` after the regression job. Capture-only flows select the old controls independently of the known exact-label failure, without weakening regression assertions. [Computed styles and accessibility snapshots](download-controls.json) retain both stages and exact commits. The old comboboxes already expose File type and Select pages names; their nested label text prevents the exact-label lookup. The old Size slider is unnamed because the wrapping label targets the output first; the new slider is explicitly named Size. Quality is verified by the current JPG regression, but is not shown in these SVG captures.
- Capture data uses synthetic demo pages in free job logs, avoiding artifact/cache storage and production data. Desktop before/after SHA-256: `bae8ba7be4f5162a7cbeeeaf641fc178f1fda58be51deee18d2864f7b6c6889c`. Mobile before/after: `35224a18f9f0587dfa34eaa9db57711e7c5cc79f3534fc654b36b1b360420a87`.
- No original/clone paired captures are available; no reference visual match is claimed. The existing report's reference download documentation establishes workflow/options, not measured layout parity.

All export files remain local to the browser/device. No new dependency, hosted service, paid gate, auth/analytics/billing change or secret. Existing gaps remain, including PPTX/video/GIF, editable/vector PDFs, print production options, public sharing and reference layout parity.

| Viewport | Clone before | Clone after |
| --- | --- | --- |
| 1440 × 900 | [Before](download-desktop-before.png) | [After](download-desktop-after.png) |
| 390 × 844 | [Before](download-mobile-before.png) | [After](download-mobile-after.png) |
