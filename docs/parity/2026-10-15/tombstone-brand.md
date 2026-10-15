# Owner-supplied tombstone branding

The owner requested the supplied tombstone/X mark anywhere the product used a Canva-style icon, including the website favicon. This is an intentional branding difference from Canva.

- Source: `Black Tombstone with Transparent X.png`, supplied 2026-10-15; SHA-256 `c4689903fd99a891355befe2543bb4538f6fde3e3393f70a681b1150de2991aa`.
- Selected image was recolored with the built-in image generation tool, using the source as an edit target. No API-key CLI or external image-generation service was configured.
- Final app asset: [mark.png](../../../public/brand/mark.png), 256 × 256 RGBA. Teal → blue → purple gradient; transparent background and X cutout. SHA-256 `daf1a018b4b6f5d9f678343edb9394af8fa9da1d584cd68c21ddb6b3caf1cc2d`.
- Favicon assets: 16, 32 and 48 pixel PNGs plus a multi-resolution ICO; Apple touch icon: 180 pixels. All live in `public/brand/` and are downscaled from the selected tool output with the existing Sharp installation. The generated full-resolution source remains in the local image-generation output directory.
- Consumers: homepage header/footer, shared Logo (including login and generic app header), Projects wordmark, dashboard/editor branded AI icons, and the editor's Ask CanvaIsDead action. The root layout supplies base-path-aware icon links for all routes. Generic tool icons and Google's official authentication mark remain separate from product branding.
- Validation: inspect selected asset and 32 pixel favicon; verify RGBA dimensions, transparent center/background, and all three ICO frames. Typecheck, unit tests, changed-file supplemental lint and build results are logged in the parity report. No fresh browser screenshots: the existing browser launch blocker remains.

## Final prompt for the selected output

Built-in tool mode, `transparent_background=true`, with the user image as the referenced edit target:

> Use case: precise-object-edit. Asset type: application brand icon and website favicon. Edit target: the attached black tombstone icon with an X-shaped transparent cutout. Recolor ONLY the tombstone's existing black silhouette using a smooth diagonal Canva-like gradient: bright teal #00C4CC at upper left, blue #3485DB through the middle, purple #7D2AE8 at lower right. Preserve the original tombstone silhouette, rounded arch, short wide base, proportions, and large X cutout exactly. Keep the surrounding background and the X cutout genuinely transparent, with clean crisp antialiased edges. Center the full intact icon on a square transparent canvas with modest even padding so it reads clearly as a favicon. Flat 2D logo, no letters, no extra symbols, no shadow, no texture, no 3D, no mockup. Do not add the Canva logo or wordmark.

A cleanup iteration was inspected but not selected; the first recolored output supplies the committed sizes. No image from Canva was copied.
