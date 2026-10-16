# Presentation controls and native verification

Date: 2026-10-16. PR: [#50](https://github.com/tommy-muckstack/canvaisdead/pull/50). Parent: #49, `6620fc8655be8082258b0279e131f5d24944af83`. Status: **differs**; mobile live controls and the scoped presentation flows are verified, with outstanding gaps below.

## Reference and observed gaps

The original documents full-screen navigation, separate audience/presenter views, private notes and next-slide previews. Live saved edits should retain the current slide, with an option to hide updates. These are functional criteria, not evidence of matching layout. Sources: [presentation modes](https://www.canva.com/help/presentation-modes/) and [presenting designs](https://www.canva.com/help/presenting-designs/), read 2026-10-16.

Native parent captures confirm that the clone's mobile CSS hides **Live edits** (`display:none`, zero-size bounds). Removing that hiding rule makes the existing switch available in the wrapped footer at 390px. Tests actually pause and resume saved text updates. Storage, synchronization and navigation logic are unchanged; no service, licensed content, billing, auth, analytics or dependency change.

The old native test returned to an editor initialized on page 1, reopened Presenter view and tried to click disabled Previous. Parent captures confirm page 1 and the disabled button. The corrected test explicitly selects page 2 before reopening Presenter view, asserts page 2 in both windows, and then exercises Previous. Original navigation/autoplay/notes assertions remain. This fixes a test setup assumption, not a backward-navigation defect. Restoring the last edited/presented page remains a separate behavior gap.

## Completed verification

Tested code: `b7cf8243beeeb71bf69f5469d440e0708cd9ec65`, tree `ea518fd233fe52bed956a60d5e0f4f5c6fe01d29`. Completed [run 38915415743](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38915415743) passes clean install on Node 24.12, lint, typecheck, **388 unit tests in 37 files**, and production build. Local code checks also pass using the documented dependency overlay.

Native Chromium at **1440 × 900** and **390 × 844** reports:

| Job | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Focused presentation / menus / editor / downloads, 117021499287 | 52 | 0 | 0 |
| Storage / recovery / handoff, 117021498588 | 32 | 0 | 0 |
| General editor / library, 117021499008 | 71 | 23 | 2 |
| **All 180 regression instances** | **155** | **23** | **2** |

All six presentation instances pass. Four are new; the two existing cases proceed after explicitly choosing their starting page. Twelve separate baseline capture flows pass and are excluded from the regression count. No forced clicks, longer deadlines or deleted behavioral assertions. No rerun was used to replace this result.

Verified presentation behavior:
- Selected-page startup, Home, timed autoplay and return to the editor.
- Backward navigation between presenter/audience windows, notes shown only in presenter UI, and native `document.fullscreenElement` present in standard-mode captures at both widths.
- Live edits can be paused while another editor saves text and notes, resumed to display the latest text without changing slides, and left enabled for subsequent saved updates. Notes do not appear in the standard slide UI.
- Audience-originated navigation updates the presenter. Reload and close/reopen reconnect to the current slide. A separate session stays independent and has no rendered speaker notes.
- Reloading the editor displays the latest saved headline; the immediate-return cache gap below is recorded separately.

One mobile Templates/search case that passed in #49 fails in this run at `editor-shell.spec.ts:9`, waiting for Search templates. The same case previously failed intermittently in the #46 investigation. Its cause is not established by this run. The other 22 failed instances remain from #49; failures include fixtures/selectors and interactions requiring investigation, not 23 established product regressions.

## Newly confirmed return-cache gap

At both widths, after another editor saves **“Visible update”** and the presentation displays it, exiting presentation and selecting page 2 renders the old cached **“Live slide”** headline. Reload then displays **“Visible update”**. The saved data is intact, but the editor immediately reopened through client navigation is stale.

The test emits both observed strings in `PARITY_PRESENTATION_RETURN`, retained in the metadata below. Immediate freshness is a diagnostic observation, not a passing assertion. Source inspection finds an owner-scoped in-memory design store retained across route changes; an already-loaded store does not reread on load. A follow-up must refresh an idle saved snapshot without discarding pending/conflicting edits or overwriting newer storage. This PR does not solve that cache lifecycle.

## Retained captures

All ten original PNGs were saved from job 117021499287 and visually inspected. The control captures use two blank fixture pages and a generated private note; the separate live-edit tests use real text artwork. No production design content enters the CI evidence.

| State | Desktop before | Desktop after | Mobile before | Mobile after |
| --- | --- | --- | --- | --- |
| Standard, page 2 | [PNG](presentation-standard-desktop-before.png) | [PNG](presentation-standard-desktop-after.png) | [PNG](presentation-standard-mobile-before.png) | [PNG](presentation-standard-mobile-after.png) |
| Presenter, page 1 | [PNG](presentation-presenter-desktop-before.png) | [PNG](presentation-presenter-desktop-after.png) | [PNG](presentation-presenter-mobile-before.png) | [PNG](presentation-presenter-mobile-after.png) |
| Audience, page 1 | — | [PNG](presentation-audience-desktop-after.png) | — | [PNG](presentation-audience-mobile-after.png) |

[Geometry, computed styles, accessibility snapshots, fullscreen state, pixel comparisons, return-cache observations and provenance](presentation-controls.json).

The mobile Live edits label changes from hidden to **77 × 19 px**. Standard/presenter footers remain **390 × 96 px**; the new switch redistributes the second row without increasing footer height or changing the captured slide area. All footer controls are visible and inside the viewport in the six changed captures, including the two-row mobile audience footer. Physical-device touch target behavior is not established.

Desktop geometry/styles are unchanged. Standard screenshots are pixel-identical. Presenter screenshots differ by eight pixels at the page-number input border, maximum channel delta 1/255; the cause is not established. Each mobile standard/presenter pair differs only in the second footer row (7,136 pixels; bounds x22–367/y800–835), where the switch and adjacent controls now appear.

These are parent/changed clone captures. No paired original/clone browser screenshots or visual-match claim.

## Remaining requirements

Immediate editor cache freshness, return-page restoration, exact original appearance, physical-device fullscreen/touch behavior, drawing, effects, music timers, recording, remote control and offline availability remain unfinished or unverified. Same-browser audience synchronization is not remote/cross-device sharing. Present mode remains **differs**; the dependent stack stays unmerged.
