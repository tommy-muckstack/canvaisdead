# Presentation controls and native verification

Date: 2026-10-16. Parent: #49, `6620fc8655be8082258b0279e131f5d24944af83`. Status: **differs**; native follow-up results are pending.

## Reference and observed gaps

The original documents standard full-screen navigation, a separate audience view, and private presenter notes/next-slide previews. It also describes live saved edits retaining the current slide and a control for hiding those updates. These are functional reference criteria, not evidence of matching layout. Sources: [presentation modes](https://www.canva.com/help/presentation-modes/) and [presenting designs](https://www.canva.com/help/presenting-designs/), read 2026-10-16.

The clone's mobile CSS explicitly hides its existing **Live edits** control. Remove that hiding rule so the switch is available in the wrapped footer at 390px. Storage, local synchronization and presentation logic are unchanged. No external service, licensed content, billing, auth or analytics change.

The previous native presentation test returned to an editor that initializes on page 1, reopened Presenter view, and tried to click Previous while that control was disabled. The setup now explicitly selects page 2 before reopening Presenter view, then asserts page 2 in both windows before going backward. The original notes/privacy/navigation/autoplay assertions remain. The editor's reset to page 1 is a separate behavior gap; this PR does not claim to restore the last edited/presented page.

## Verification scope

The existing presentation case covers starting from the selected page, Home, timed autoplay, returning to the editor, presenter/audience navigation and notes privacy. Two added cases cover pausing/resuming actual saved text updates without changing slides, audience-to-presenter navigation, audience reload/reopen, separate synchronization sessions, and notes exclusion. The live-update case also records the editor's cached headline on return and verifies the latest saved headline after reload; immediate cache freshness is a separate observation, not a passing assertion. Files and artwork remain in the same browser's IndexedDB; generated local fixtures are used throughout.

The full suite contains 180 browser instances: 52 focused, 32 storage and 96 general, without overlapping selection. Twelve separate baseline capture flows are excluded from that count. The existing public Linux workflow supplies native Chromium at 1440 × 900 and 390 × 844; no longer timeouts, forced clicks or removed behavioral assertions.

Local lint, typecheck, all 388 unit tests in 37 files and production build pass using the documented dependency overlay. Native verification is pending.

Parent/changed screenshots will retain standard and presenter states at both sizes, plus changed audience states. Computed geometry, footer controls, live-switch visibility, current page, fullscreen state and accessibility snapshots will be retained. Parent Presenter captures also record page 1 and its disabled Previous action to distinguish test setup from a navigation defect. The final evidence will identify any differences caused by viewport wrapping, focus or the running presenter clock.

## Remaining requirements

Exact original/clone visual comparison, return-page restoration, physical-device fullscreen/touch behavior, presentation drawing, effects, music timers, recording, remote control and offline availability remain unfinished or unverified. Same-browser audience synchronization is not remote/cross-device sharing. Keep Present mode marked **differs** until these gaps are addressed or justified by the owner's constraints.
