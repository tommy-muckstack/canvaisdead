# Editor reference supplied by the owner

Source: the conversation attachment `image (8).png`, supplied 2026-10-15. Original local file: `/Users/tommykeeley/Downloads/image (8).png`, 3438 × 1141 pixels, SHA-256 `3faa77b3ed4e1e0e2298662b47634131ea578bc574fd528d3040cc0a433eb3e9`. Canva is on the left; the live clone is on the right. The attachment has not been republished as a product asset.

This is a single composite reference, not a controlled pair of 1440px/390px captures. The two panes have different widths and show different canvas zoom percentages (56% vs 71%). CSS dimensions, device pixel ratios, browser zoom and fonts cannot be recovered reliably from it. Changes below are informed by the visible differences and source inspection; they are not pixel-parity measurements.

| Observed difference | Change | Verification remaining |
| --- | --- | --- |
| Original shows a dense two-column grid of presentation-shaped previews. Clone starts with square and portrait designs, padded frames and captions. | Prioritize matching canvas aspect ratios, reduce gaps to 8px, remove frames/visible captions, preserve names as accessible labels and tooltips. Original editable art stays intact. | Paired captures, font loading, hover/focus and template application. |
| Original has a compact panel and collapse handle. | 320px desktop panel, 12px horizontal inset, 52px search control and functional collapse handle. Values are implementation choices awaiting measurement. | Computed styles at the same viewport/zoom. |
| Original page dock has larger landscape thumbnails and a nearby add control. | Center 100 × 58px thumbnails with a neutral selected outline and working add-page button; keep scrolling, grid and keyboard navigation. | Many-page overflow, keyboard focus and touch. |
| Original page has a subtle shadow, neutral workspace and compact bottom bar. | Add a subtle page shadow, coordinate workspace colors, spacing and slider width. Read actual stage padding for canvas fit instead of hard-coded offsets. | Fit at multiple document shapes and zoom levels. |
| Clone uses a cloud icon for Timer and a malformed undo path. | Original inline SVG timer, tools, undo/redo and local-save icons; keep accessible status text and avoid suggesting cloud sync. | Optical stroke/size comparison at native resolution. |
| Reference does not show mobile. Source desktop widths exceed 390px. | Start narrow screens with the panel closed; open it as an overlay, close it after adding content, wrap the header, fit the canvas to remaining space and constrain popovers. | Real 390px interaction, touch, keyboard and horizontal-overflow checks. |

Before evidence: owner-supplied composite above. New before/after browser captures are still unavailable: the in-app Node REPL/browser tool is absent, and previous Playwright/browser launches abort. `tests/e2e/editor-shell.spec.ts` defines the search, collapse, page-add and viewport checks and screenshot outputs for both configured widths, but has only been discovered, not executed.
