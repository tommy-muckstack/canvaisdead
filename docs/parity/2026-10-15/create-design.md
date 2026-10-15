# Create a design and custom dimensions — 2026-10-15

## Reference and observed difference

The official [Design from scratch guide](https://www.canva.com/en_au/help/design-from-scratch/) describes a Create entry with design-type/size search, a homepage Custom size action, px/in/mm/cm choices, dimension validation and opening a blank design. It also documents ratio locking for resizing and a new-tab preference. The [resize API reference](https://www.canva.dev/docs/apps/rest-apis/reference/resizes/create-design-resize-job/) specifies 40–8,000 pixels per side and a 25-million-pixel area limit. These written sources establish behavior to implement; they are not screenshots or proof of the current web dialog's precise appearance.

Before this change, Create in the rail was a link back to Home. Custom size silently created a 500×500 logo. Video created a thumbnail, Website created an Instagram post, and several categories did nothing. There was no dimension form, unit choice, validation or search for blank designs.

## Implemented

- One Create dialog shared by Home, Projects and Templates; Projects' empty-state action also opens it. Presentation quick-create retains the existing direct 1920×1080 action. Social media/Print browse available static formats, and More opens the full picker.
- Search the existing ten presets by label or dimensions, including `1080x1920`, with an empty-result message and route to Custom size. Preview artwork is original CSS geometry; no reference assets were copied.
- Custom width/height with px, in, mm and cm. Decimal point/comma input is accepted; malformed numbers, nonpositive values, out-of-range sides and excessive area are rejected. Measurements use the existing export system's 96 px/in and round to the nearest whole pixel before validation/creation. Switching units keeps the resulting pixel size stable.
- Ratio lock can capture oversized dimensions, then reduce either side into range. Swapping reverses the ratio too. Recent size choices derive from real active local designs, exclude Trash and invalid sizes, and deduplicate the newest six; no fabricated activity or extra data store.
- Native modal dialog, named fields, initial focus, Escape/close/backdrop dismissal, focus restoration and validation announcements. Desktop uses a category rail; narrow layouts use a horizontal category strip and two-column preset grid. These are implemented behaviors awaiting actual browser verification.
- Existing local-store safeguards apply to creation. A successful write precedes navigation; a failed write retains the design in memory with retry and local backup. Retry opens that same design after persistence succeeds. No creation while a load error, unsaved state or cross-tab conflict is unresolved, and synchronous duplicate submission is guarded.
- Missing editor types show an honest explanation and a working route back to blank designs. Dedicated photo/video/Docs/Whiteboards/Sheets/Code/Websites/Emails, file-first creation and Magic Layers are still required features, not justified exceptions or paid gates. Fixed-size US Letter/A4 artwork remains available under Print.

## Verification

- `npm run lint`: pass, zero warnings from ESLint.
- `npm run typecheck`: pass.
- `npm test`: 195 tests pass across 17 files. New cases cover invalid values, both orientations of boundary sizes, area limits, US Letter/A4 conversion, decimal commas, unit-switch stability at limits, incomplete fields, locked resizing, orientation/units and recent-size deduplication without mutation.
- `npm run build`: pass. Existing workspace-root and Next.js ESLint-plugin warnings remain. Checks use the previously documented matching dependency overlay; clean installation is still unverified.
- Fresh local production HTTP checks: Home, Projects and Templates return 200 and render exactly one native Create button with a dialog affordance. Guest entry/login/denied acknowledgment, malformed-cookie fallback, pricing redirect, naming and favicon checks still pass. HTTP cannot open or operate the client dialog.
- `npm run test:e2e -- --list`: 38 cases discovered at 1440×900 and 390×844. Four new scenarios run in both projects: search/keyboard dismissal/preset creation; dimensions/validation/units/ratio/local persistence; failed-save retry without duplication; and unavailable types without accidental creation. The scenarios include viewport bounds and editor viewBox assertions.

No browser capability has become available since the recorded Chromium/Chrome/Firefox failures. These scenarios are **not executed** here. No paired screenshots or computed-style evidence exists; the report retains `differs`. Once browser access works, capture original/before/after picker search, custom fields, errors, empty results and mobile category navigation. Verify focus containment/return, backdrop behavior, input keyboard behavior, scrolling and the saved canvas after reload.

## Remaining differences

The size catalog is small, the reference's complete create menu has not been observed at both widths, and dedicated design editors remain missing. The dialog currently opens the editor in the same tab; link-opening preferences need a profile/settings implementation. Physical units are converted into pixel dimensions without retaining original-unit metadata; exact reference rounding and print presets still need comparison. Recent sizes include all active local designs instead of a separately observed custom-size history. None of these gaps is waived by the app being free.
