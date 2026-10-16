# Download controls and native export verification

Date: 2026-10-16. Scope: the Download panel's label/control relationships and the native export flows blocked by exact label lookups in the merge review. Stacked on #42; no merge or deployment.

## Evidence and change

[Parent run 38892649896](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38892649896) finishes with 32 passing storage checks plus 77 passing, 55 failing and two skipped editor/library checks. At both widths, the Download regression cannot locate `File type` by its exact label. Other export scenarios stop at the same lookup. The old wrapping labels contain the select options, and the slider labels contain their changing outputs/dimensions. This is evidence of a label-targeting failure, not proof that exports themselves are broken or that every screen reader announces the wrong name.

File type, Size, Quality, Select pages and Page numbers now use separate visible labels explicitly linked to unique control IDs. Size/quality outputs remain visible, slider values have readable units, and format guidance, dimensions and page validation are associated as descriptions. This follows [W3C WAI's explicit-label guidance](https://www.w3.org/WAI/tutorials/forms/labels/). Existing layout classes and native inputs remain in use.

The browser regression retains exact label lookups and now checks exact control names, dynamic descriptions, keyboard slider values, and a real JPG's signature, dimensions and opaque background. Existing assertions verify selected-page SVG ZIP contents, omission of private notes, transparent PNG pixels, PDF page count/size, remembered preferences, Escape and focus return. Other targeted flows verify cropped/flipped source pixels, text spacing, page changes and original uploads through exports.

## Verification

- Local lint, typecheck, **384 unit tests in 36 files**, and production build pass with the documented dependency overlay. Native CI performs a separate clean install.
- CI partitions the same 166 instances into 32 storage, 16 download and 118 complementary editor/library cases. No scenario is removed. Download failures print bounded synthetic demo context.
- Native results are pending. The download test records computed control styles, an accessibility snapshot and a generated demo screenshot in free job logs, avoiding artifact/cache storage. These contain synthetic test data only, never production accounts or user files. Retained captures will be linked after inspection.
- Before evidence is the parent's actual browser failure log. No original/clone paired visual captures are available; no visual match is claimed. The existing report's reference download documentation establishes workflow/options, not measured layout parity.

All export files remain local to the browser/device. No new dependency, hosted service, paid gate, auth/analytics/billing change or secret. Existing gaps remain, including PPTX/video/GIF, editable/vector PDFs, print production options, public sharing and reference layout parity.
