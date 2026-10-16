import type { Page } from "@playwright/test";

export async function captureEditorCache(page: Page, viewport: string, variant: "before" | "after") {
  await page.evaluate(() => document.fonts.ready); await page.mouse.move(0, 0);
  const canvas = page.getByTestId("page");
  const metrics = await canvas.evaluate(node => {
    const text = node.querySelector("text")!, css = getComputedStyle(text), box = node.getBoundingClientRect();
    return { headline: text.textContent, canvas: { x: box.x, y: box.y, w: box.width, h: box.height }, font: css.font, color: css.fill, saveState: document.querySelector(".cv-save-state")?.getAttribute("aria-label") };
  });
  const png = await page.screenshot({ fullPage: true });
  if (process.env.CI) console.log("PARITY_DESIGN_CACHE_CAPTURE " + JSON.stringify({ viewport, variant, metrics, png: png.toString("base64") }));
  return metrics;
}
