# Library actions — 2026-10-15

## Reference and before/after

Reference behavior was checked against the official [rename guide](https://www.canva.com/help/rename-designs/), [copy guide](https://www.canva.com/help/duplicate-designs/) and [Trash guide](https://www.canva.com/help/deleted-designs/). These describe editing a title below its thumbnail, making a copy from its More menu, and recovering or deleting designs in Trash within 30 days. They do not establish visual parity.

Before this change, Home and Projects repeated a card implementation with a hover-only Delete button and browser confirmation that immediately removed the design. The title had no library rename action, copying was absent, and the Trash link was inert. Projects search and mobile Trash access were absent.

After this change, Home/Projects share a card menu with inline title editing and full-document copies. Moving to Trash preserves the existing document and supports Undo. Projects has active and Trash views with search, mobile navigation, restoration, confirmed permanent deletion and Empty Trash. Restoring keeps the same design ID. Copies preserve page artwork, notes, image data and locks without sharing mutable objects with their source.

The implementation uses the existing generated SVG previews and icon primitives. No reference-owned assets or paid services were added.

## Storage and intentional limits

- All design operations write the existing account/guest browser library. No file or design data is uploaded. Existing optional analytics sends only allowlisted event names/properties after consent.
- Trashed designs are inaccessible to editor and presentation routes. A stale editor save cannot make a trashed design active. The existing local store refuses to replace a library that changed in another tab; transactional multi-tab collaboration remains unsupported.
- Thirty days are measured by the device clock. Expired Trash is pruned when the library opens and approximately once a minute while it stays open, subject to storage access and browser timer throttling. No background server runs while the app is closed. This is a deliberate consequence of device-only storage.
- Permanent deletion has no server-side support recovery window. A previously downloaded backup can recover the design as an active new copy, including copies of expired Trash. Backups themselves are never deleted by the app.
- Delete/Empty Trash confirmation targets the exact IDs and deletion timestamps shown, so it cannot remove newly trashed or restored/retrashed versions. Buttons wait for save recovery after a failed local write.
- Folders, stars, shared ownership, selection/bulk movement, and editor File-menu duplication remain incomplete. These are not declared parity exceptions.

## Verification

`npm run lint`, `npm run typecheck`, all 169 unit tests, and `npm run build` pass. Playwright discovers 30 cases in 11 files, including six library cases across the two widths; discovery is not execution. Local production HTTP checks return 200 and the correct serialized view for Projects, Trash, and an unknown-view fallback. The existing workspace-root and missing Next.js ESLint-plugin build warnings remain. Unit coverage exercises document-copy isolation, retention boundaries, stale confirmations, backup recovery, validation, quota retry, storage conflicts, presentation guards and analytics redaction. The browser suite includes rename/copy/trash/restore/permanent deletion, keyboard validation/search and expiration after reopening, at both configured widths.

Browser execution and original/clone-before/clone-after captures at 1440 × 900 and 390 × 844 remain blocked by the previously recorded browser-launch failures. The new browser scenarios are not counted as passing. Existing screenshots and the owner's editor composite cannot verify these library changes. No screenshot artifact is fabricated or marked as a match.
