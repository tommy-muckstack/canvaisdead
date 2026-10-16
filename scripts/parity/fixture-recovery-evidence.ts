import type { Locator, Page } from "@playwright/test";

/** Record generated demo/guest UI only; never include cookie values or library bytes. */
export async function captureFixtureRecovery(page: Page, viewport: string, scenario: string, subject: Locator, details: Record<string, unknown>) {
  await subject.scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready); await page.mouse.move(0, 0);
  const control = await subject.evaluate(node => {
    const box = node.getBoundingClientRect(), css = getComputedStyle(node);
    return { x: box.x, y: box.y, w: box.width, h: box.height, font: css.font, color: css.color, padding: css.padding, gap: css.gap, radius: css.borderRadius, shadow: css.boxShadow };
  });
  const observation = { viewport, scenario, variant: process.env.PARITY_FIXTURE_CAPTURE === "before" ? "before" : "after", control, aria: await subject.ariaSnapshot(), details };
  if (process.env.CI) console.log("PARITY_FIXTURE_RECOVERY " + JSON.stringify({ ...observation, png: (await page.screenshot()).toString("base64") }));
}
