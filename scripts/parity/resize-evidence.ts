import { expect, type Page, waitForDesignSave } from "../../tests/e2e/fixtures";
import { setupFileMenu } from "./file-menu-evidence";
export { fileLibrary } from "./file-menu-evidence";

export async function setupResize(page: Page) {
  const id = await setupFileMenu(page);
  await page.getByRole("textbox", { name: "Design name", exact: true }).fill("Resize actions");
  await waitForDesignSave(page); await page.reload(); await expect(page.getByTestId("page")).toBeVisible(); await waitForDesignSave(page);
  return id;
}
export async function captureResize(page: Page, viewport: string, variant: string, state: string) {
  await page.evaluate(() => document.fonts.ready); await page.mouse.move(0, 0);
  const observation = await page.getByRole("button", { name: "Resize", exact: true }).evaluate(button => {
    const read = (node: Element) => { const b = node.getBoundingClientRect(), s = getComputedStyle(node); return { x: b.x, y: b.y, w: b.width, h: b.height, font: s.font, color: s.color, padding: s.padding, gap: s.gap, radius: s.borderRadius, shadow: s.boxShadow }; };
    const panel = document.querySelector(".cv-resize[open],.cv-top .cv-pop");
    return { viewport: { w: innerWidth, h: innerHeight }, documentWidth: document.documentElement.scrollWidth, button: read(button), panel: panel && read(panel), controls: panel && Array.from(panel.querySelectorAll("button,input,select"), node => ({ ...read(node), label: node.getAttribute("aria-label") ?? node.textContent, disabled: node.matches(":disabled") })) };
  });
  const panel = page.locator(".cv-resize[open],.cv-top .cv-pop");
  const result = { viewport, variant, state, metrics: observation, aria: await panel.count() ? await panel.ariaSnapshot() : null };
  if (process.env.CI) console.log("PARITY_RESIZE " + JSON.stringify({ ...result, png: (await page.screenshot()).toString("base64") }));
  return result;
}
