import { expect, type Page } from "../../tests/e2e/fixtures";
import { createPresentationDeck } from "./presentation-evidence";
export { createPresentationDeck };
export async function timerPanel(page: Page) { const panel = page.getByRole("dialog", { name: "Timer", exact: true }); if (!(await panel.isVisible())) await page.getByRole("button", { name: "Timer", exact: true }).click(); await expect(panel).toBeVisible(); return panel; }
export async function captureTimer(page: Page, viewport: string, variant: "before" | "after", state: string) {
  if (state.startsWith("presentation")) await expect(page.getByRole("main", { name: "Presentation", exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready); await page.mouse.move(0, 0);
  const metrics = await page.evaluate(() => {
    const read = (node: Element | null) => { if (!node) return null; const r = node.getBoundingClientRect(), s = getComputedStyle(node); return { x: r.x, y: r.y, w: r.width, h: r.height, font: s.font, color: s.color, padding: s.padding, gap: s.gap, radius: s.borderRadius, shadow: s.boxShadow }; };
    const panel = document.querySelector('.cv-countdown'), footer = document.querySelector('.cv-present-controls, .cv-zoom');
    return { viewport: { w: innerWidth, h: innerHeight }, documentWidth: document.documentElement.scrollWidth, panel: read(panel), footer: read(footer), trigger: read(document.querySelector('.cv-timer-trigger')), remaining: panel?.querySelector('[role="timer"]')?.textContent,
      controls: panel ? Array.from(panel.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement>('button,input,select'), node => ({ label: node.getAttribute('aria-label') ?? (Array.from(node.labels ?? [], label => label.textContent).join(' ') || node.textContent), ...read(node) })) : [] };
  });
  const panel = page.getByRole("dialog", { name: "Timer", exact: true }), aria = await panel.isVisible() ? await panel.ariaSnapshot() : await page.locator('.cv-present-controls, .cv-zoom').ariaSnapshot();
  if (process.env.CI) console.log("PARITY_TIMER " + JSON.stringify({ viewport, variant, state, metrics, aria, png: (await page.screenshot()).toString("base64") })); return metrics;
}
