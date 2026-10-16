# Editor File menu and local copies

Date: 2026-10-16. Native verification pending.

The File button was inert. It now opens a viewport-contained keyboard menu for Create a new design, Make a copy, Rename and Download. Create uses the existing real picker; Rename focuses/selects the design-name field; Download opens the existing download panel and restores File focus when closed. Copy snapshots the latest committed editor model with independent design/page/element/group IDs while preserving all pages, notes, locks, crop/flip state and original image bytes.

Copies use the existing local IndexedDB writer. They open only after save acknowledgement. Failed writes retain exactly one copy for backup/retry; an intervening successful autosave can reopen that same pending copy. A navigation/account/design lifetime guard prevents delayed completion from opening a copy after the user has left. No cloud file service, new dependency, secrets or paid gate.

## Reference evidence and remaining scope

The official [copy workflow](https://www.canva.com/help/transfer-designs-to-personal-account/) documents File → Make a copy. The official [download guide](https://www.canva.com/help/download-or-purchase/) describes file-type/page/size choices. [Version history](https://www.canva.com/en_gb/help/version-history/) and [print/margin settings](https://www.canva.com/help/margins-bleed-crop-marks/) establish additional required File capabilities; these are not waived because the original charges for some features.

The original editor menu is not directly captured: original account access remains challenge-blocked. Exact menu contents/order/header, padding/icons, title editing placement, mobile presentation and new-tab behavior remain unverified. View/ruler/guide settings, version history, folders, full import/print and other File options remain implementation work. This incremental menu is not a full parity claim.

## Verification plan

Six native scenarios at 1440px and 390px cover keyboard/open/Escape/Tab/outside dismissal and bounds; real edited multi-page copies with ID isolation and source-byte equality; independent reload/library listing; picker creation/cancellation; actual SVG download/focus; quota failure/backups/retry; implicit recovery; and queued-write navigation cancellation. Existing native regression and storage suites also run. Computed metrics/accessibility and before/after captures compare against the parent Editor/EditorLoader/CSS; these are clone-revision captures, not original parity evidence.
