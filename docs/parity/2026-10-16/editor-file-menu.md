# Editor File menu and local copies

Date: 2026-10-16. [PR #60](https://github.com/tommy-muckstack/canvaisdead/pull/60), open for review; not merged.

The File button was inert. It now opens a viewport-contained keyboard menu for Create a new design, Make a copy, Rename and Download. Create uses the existing real picker; Rename focuses/selects the design-name field; Download opens the existing panel and restores File focus when closed. Copy snapshots the latest committed editor model while preserving all pages, notes, locks, nested groups, crop/flip state and original image bytes.

Copies receive a new design ID and fresh element/group IDs; stored pages receive new page IDs. They use the existing local IndexedDB writer and open only after save acknowledgement. Failed writes retain exactly one copy for backup/retry; an intervening successful autosave can reopen that same pending copy. A navigation/account/design lifetime guard prevents delayed completion from opening a copy after the user has left. The native queued-write test exercises leaving for Home. No cloud file service, new dependency, secrets or paid gate.

## Native findings and fixes

- The first fixture had an outer group with only one child. The production validator correctly rejected it on reload, so no File action was reached. Added a second child to that outer group and validate the whole fixture before writing it.
- The backup-copy helper intentionally preserves page-local element/group IDs. File copies now explicitly remap those IDs. Native comparisons retain the complete source content and require disjoint page/element/group IDs for the multipage fixture, independent editing/reload and an unchanged original.
- Download progress replaced the focused action button, leaving keyboard focus outside the panel after an export. Keep the same button mounted while switching its action between Download and Cancel. The native flow now asserts focus on Download after an actual SVG export, then Escape closes the panel and returns focus to File. Existing Share/download tests also pass.

## Verification

Six scenarios run at both 1440 × 900 and 390 × 844:

- Keyboard ArrowDown/ArrowUp opening, End/wrap, Escape/Tab/outside dismissal, focus restoration and viewport containment.
- Actual text, notes and name edits followed by copying all pages, full content/original-byte equality, independent IDs, copy rename/reload and both designs in Home.
- Failed-copy recovery through a later edit, followed by reopening the already saved copy without creating a second pending duplicate.
- Real SVG download containing artwork and excluding private notes, retained action focus, File focus restoration, picker cancellation and a new Logo design with the original unchanged.
- Quota failure with no premature navigation or persisted overwrite, disabled duplicate action, an actual recovery backup containing one copy, retry, reload and exactly one new design.
- A real queued IndexedDB transaction: leave for Home before it commits, release it, verify persistence and ensure no delayed editor navigation.

| Run | Result |
| --- | --- |
| [38950805442](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38950805442), code `c6542426e523ecfc7ffb7b2905df5a42df2b00d3` | 186 browser passes, 12 File fixture failures, 2 existing touch-only skips; both baseline flows fail at the same fixture. No File behavior claimed from this run. |
| [38951782838](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38951782838), code `5f5a4041a42632913751f7ad670a153e1c1380b0` | 194 passes, 4 failures, 2 existing skips; both baseline flows pass. Eight File instances pass; ID-isolation and post-export focus each fail at both widths. |
| [38952862692](https://github.com/tommy-muckstack/canvaisdead/actions/runs/38952862692), code `f04a06d7cba4eaac0204a48df151083de5ee0558` | **198 passed / 0 failed / 2 existing touch-only skips**, plus **2 baseline flows passed**. All 12 File instances pass. |

Each run passes clean install, lint, typecheck, **395 unit tests in 37 files** and build. The final tree is `e811dce7f63509c3116282b5872086a166415ae3`. Its 200 native cases partition into 110 focused, 32 storage and 58 general cases (56 pass, 2 touch-only skips), with no overlap. The two unchanged skips require physical touch dragging; mouse-driven mobile-width checks do not establish physical-touch parity. No assertion was removed, skip added, unchanged run retried or live run cancelled.

## Captures and measured controls

Eight PNGs form four before/after pairs. Four unique images were visually inspected; byte/pixel checks establish identical counterparts. The final run reproduces all eight images, metrics and accessibility snapshots from the corrected-fixture run exactly. Closed editor captures are byte/pixel-identical at both widths. Clicking the old File button leaves it closed; ArrowDown on the new File button opens the menu and focuses its first item. Activated differences are confined to the menu and shadow.

| State | Desktop before / after | Mobile before / after |
| --- | --- | --- |
| Closed | [Before](file-closed-desktop-before.png) / [After](file-closed-desktop-after.png) | [Before](file-closed-mobile-before.png) / [After](file-closed-mobile-after.png) |
| Activated | [Before](file-activated-desktop-before.png) / [After](file-activated-desktop-after.png) | [Before](file-activated-mobile-before.png) / [After](file-activated-mobile-after.png) |

The menu is 280px wide at both widths, with 6px inner padding, 8px corner radius, 14px Plus Jakarta Sans text, and a 0 4px 24px shadow at 16% opacity. Desktop rows are at least 36px high; mobile rows are 44px. Keyboard focus has a 2px purple inset ring. The menu is at (50, 45) on desktop and (8, 90.5) on mobile; document widths remain 1440px and 390px. Original File-button geometry and computed styles remain unchanged. [Raw metrics, accessibility, hashes, pixel differences and run records](file-menu-controls.json).

Baseline captures restore main `378fd55a6885ebe0c50defac7b497f01918d802a`'s Editor, EditorLoader, DownloadPanel and CSS in an ephemeral build. The shared context menu's optional initial-focus parameter remains so the unused new component typechecks; the parent Editor never mounts the new File component. These captures compare clone revisions, not the original.

## Reference evidence and remaining scope

The official [copy workflow](https://www.canva.com/help/transfer-designs-to-personal-account/) documents File → Make a copy. The official [download guide](https://www.canva.com/help/download-or-purchase/) describes file-type/page/size choices. [Version history](https://www.canva.com/en_gb/help/version-history/) and [print/margin settings](https://www.canva.com/help/margins-bleed-crop-marks/) establish additional required File capabilities; these are not waived because the original charges for some features.

The original editor menu is not directly captured: original account access remains challenge-blocked. Exact menu contents/order/header, padding/icons, title editing placement, mobile presentation and new-tab behavior remain unverified. View/ruler/guide settings, version history, folders, full import/print and other File options remain implementation work. Broader editor chrome, real Google/email completion, original comparisons and physical touch remain unfinished. This incremental menu is not a full parity claim.
