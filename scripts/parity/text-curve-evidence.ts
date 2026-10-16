import { expect, type Page, waitForDesignSave } from "../../tests/e2e/fixtures";
import { fileLibrary, openEffects, setupTextEffects } from "./text-effects-evidence";
import { settledFonts } from "./font-layout-evidence";
export { fileLibrary, openEffects };
export const CURVE_TEXT = "STAY CURIOUS";
export async function setupCurve(page: Page) {
  const id = await setupTextEffects(page);
  await page.evaluate(async ({ id, text }) => {
    const key = (await window.designTestStorage.keys())[0], library = JSON.parse(await window.designTestStorage.getItem(key));
    const design = library.find((d: { id: string }) => d.id === id); design.name = "Curved text";
    Object.assign(design.pages[0].els[0], { text, w: 500, fontSize: 48, lineHeight: 1.2 });
    await window.designTestStorage.setItem(key, JSON.stringify(library));
  }, { id, text: CURVE_TEXT });
  await page.reload(); await expect(page.getByTestId("page")).toBeVisible(); await waitForDesignSave(page); await settledFonts(page);
  const box = await page.getByTestId("page").boundingBox(); await page.mouse.click(box!.x + box!.width * 150 / 800, box!.y + box!.height * 120 / 600); return id;
}
export async function chooseCurve(page: Page, value: number) {
  const panel = await openEffects(page); await panel.getByRole("button", { name: "Curve", exact: true }).click();
  const input = panel.getByRole("spinbutton", { name: "Curve value", exact: true }); await input.fill(String(value)); await input.press("Enter"); await waitForDesignSave(page); return panel;
}
export async function captureCurve(page: Page, viewport: string, variant: string, state: string) {
  await settledFonts(page); await page.mouse.move(0, 0);
  const metrics = await page.evaluate(() => {
    const read = (element: Element | null) => { if (!element) return null; const r = element.getBoundingClientRect(), s = getComputedStyle(element); return { x: r.x, y: r.y, w: r.width, h: r.height, font: s.font, padding: s.padding, gap: s.gap, radius: s.borderRadius, color: s.color }; };
    const canvas = document.querySelector('[data-testid="page"]')!, curve = canvas.querySelector('[data-text-curve]');
    return { viewport: { w: innerWidth, h: innerHeight }, documentWidth: document.documentElement.scrollWidth, canvas: read(canvas), panel: read(document.querySelector('.cv-effects')), shape: read(document.querySelector('.cv-curve-settings')),
      amount: curve?.getAttribute('data-text-curve'), paths: Array.from(canvas.querySelectorAll('textPath'), node => ({ text: node.textContent, href: node.getAttribute('href'), bounds: read(node) })),
      selection: read(canvas.querySelector('[data-testid="selection"] > rect')) };
  });
  const panel = page.getByRole("region", { name: "Text effects", exact: true }), aria = await panel.isVisible() ? await panel.ariaSnapshot() : await page.getByTestId("page").ariaSnapshot();
  if (process.env.CI) console.log("PARITY_TEXT_CURVE " + JSON.stringify({ viewport, variant, state, metrics, aria, png: (await page.screenshot()).toString("base64") })); return metrics;
}

export async function selectCurveText(page: Page, editing = false) {
  const bounds = await page.getByTestId("page").locator('[data-text-curve]').first().boundingBox(); if (!bounds) throw Error("Curved text is missing");
  if (editing) await page.mouse.dblclick(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  else await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
}
