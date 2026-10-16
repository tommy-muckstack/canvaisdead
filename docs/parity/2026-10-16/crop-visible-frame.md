# Verify reopening the visible crop frame

Date: 2026-10-16. PR [#58](https://github.com/tommy-muckstack/canvaisdead/pull/58), based on #57. This corrects browser test targeting and verifies existing crop behavior; production code is unchanged.

## Native diagnosis

The old desktop test completes crop, Undo/Redo and reload, then double-clicks the enlarged SVG image node. That source sits inside a clipped 200 × 200 model frame with viewBox `190 90 20 20`. The original image still has 400 × 200 source bounds.

Native Chromium measurements explain the timeout:

| Observation | Desktop 1440 × 900 | Mobile 390 × 844 |
| --- | --- | --- |
| Source image screen bounds (x, y, width, height) | −1049.173, −504.320, 3853.281, 1926.641 | −543.100, 111.500, 1510, 755 |
| Viewport-clamped source-quad centroid used by the installed locator | 720, 450 | 195, 477.75 |
| Actual hit at that point | Canvas background rect | Image |
| Old locator actionability trial | Times out | Passes |
| Visible-frame center projected through the root SVG matrix | 877.467, 459 | 211.9, 489 |
| Actual hit at the frame center | Image | Image |

The original source quad is read from Chromium's DOM protocol. Its centroid is calculated using the installed Playwright locator's viewport clamping, and each point is checked with native `elementFromPoint`. A bounded trial of the original locator agrees with the measured hit. The desktop failure is a test-targeting error, not an established crop product defect.

The corrected action is a normal canvas locator double-click at the projected visible-frame center; it uses neither force nor synthetic input. Both pointerdowns are trusted and hit the image. The editor captures the pointer on the root SVG, so the resulting trusted double-click targets the canvas while the underlying hit remains the image. Delivered double-click coordinates are 877,459 on desktop and 211,489 on mobile, within one CSS pixel of the requested centers.

## Checks retained and extended

All original preview, source-byte, crop, Undo/Redo, reload and reset assertions remain. Reopening must show the crop overlay/settings and 10× zoom without modifying the saved image. Reset remains an uncommitted preview until Done. The committed reset retains the exact original source, restores the full 400 × 200 source window and produces the existing 200 × 100 model frame. One-step reset Undo/Redo and exact saved reload now pass.

All eight crop test instances run in the focused partition. They also cover keyboard crop handles, pointer cancellation, lock protection, Enter/Cancel/Reset behavior and actual SVG/PNG crop output pixels. These tests use mouse/keyboard input at both widths; physical touch is not established.

## Completed verification

[Final run 38944081289](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38944081289) tests code `d3a11b18500ecd7465bec5d4489722c6b866acff`, tree `9b75996a7bf0da16531082c4d4ba37162c588b03`. Clean install, lint, typecheck, **395 unit tests in 37 files**, and production build pass. Local lint/typecheck/build pass with the existing dependency overlay.

| Partition | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Focused crop/editor/library/exports | 90 | 0 | 0 |
| Storage/handoff | 32 | 0 | 0 |
| General editor | 63 | 1 | 2 |
| **188 regression instances, no overlap** | **185** | **1** | **2** |

Twenty-eight separate baseline flows pass: twenty existing control captures, six fixture flows and both corrected crop flows against the parent build. The one remaining regression failure is mobile nested-group member editing at `groups.spec.ts:66`; its target/action geometry still needs investigation. The two existing skips concern native mouse dragging on mobile. No new final failure or skip was introduced.

The [initial run 38942941028](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38942941028), code `7303603a1329e35bb604df5dcd8fc5fa5a7b401b`, reached the reopened overlay/settings at both widths but stopped on a newly added assertion incorrectly expecting the double-click target to remain the image. That run had 183 passes / 3 failures / 2 skips, with 26 baseline passes and two crop baseline failures; no crop captures were emitted. Source inspection showed root SVG pointer capture. The follow-up observes the initial image pointerdowns and retargeted canvas double-click separately, retaining native trust, underlying image-hit and coordinate checks. The original behavior assertions were not removed. The changed code was verified after the first run completed; no unchanged rerun or cancellation was used.

## Retained comparison

Eight unmodified PNGs form four byte- and pixel-identical pairs. The four unique images were visually inspected; each counterpart has the same exact bytes. Subject geometry/styles, accessibility snapshots, native quads/hit targets, input events and saved reset details also match in every pair.

Before/after means the same parent/current production implementation exercised through a valid visible-frame action, not a visual product change or a direct original-app comparison.

| State | Desktop before / after | Mobile before / after |
| --- | --- | --- |
| Reopened 10× crop | [Before](crop-reopened-desktop-before.png) / [After](crop-reopened-desktop-after.png) | [Before](crop-reopened-mobile-before.png) / [After](crop-reopened-mobile-after.png) |
| Reset, Undo/Redo and reload | [Before](crop-reset-desktop-before.png) / [After](crop-reset-desktop-after.png) | [Before](crop-reset-mobile-before.png) / [After](crop-reset-mobile-after.png) |

The reopened crop section is x84/y64, 295 × 385 on desktop and x78/y579, 297 × 299 on mobile. Measured font is 16px/24px IsDead Plus Jakarta Sans, color rgb(14,19,24), with zero section padding/radius and no section shadow. At 390px its full section extends below the initial viewport; Reset and Done are reachable in the native flow, but the visible panel/scrolling layout still needs manual touch and original comparison. Matching screenshots do not waive that work.

[Raw observations, events, accessibility snapshots, comparisons and both run summaries](crop-reopen-controls.json).

## Remaining scope

Image cropping remains **differs**. Original comparison, physical touch, broader media/frame behavior and other editing features are unfinished. Independent original requests returned HTTP 403. Mobile nested-group editing remains the combined suite's unresolved failure.

No production, dependency, secret, authentication, storage, billing or deployment changes. The existing public-only/read-only workflow retains all 188 regression instances and separate baseline captures. PR stays draft/unmerged; main remains `2784245c91faacbac463a6a0cf0b901fdab960b9`.
