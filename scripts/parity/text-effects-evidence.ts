import { expect, type Page, waitForDesignSave } from "../../tests/e2e/fixtures";
import { blankDesign, makeEl } from "../../lib/design/ops";
import type { Design } from "../../lib/design/types";
import { designPages } from "../../lib/design/pages";
import { fileLibrary, setupFileMenu } from "./file-menu-evidence";
import { settledFonts } from "./font-layout-evidence";
export { fileLibrary };
export const EFFECT_TEXT = "MAKE\nSOME NOISE";
export async function setupTextEffects(page: Page) {
  const id = await setupFileMenu(page), canvas = blankDesign({ w: 800, h: 600 });
  const design: Design = { id, name: "Text effects", w: 800, h: 600, updatedAt: 1, pages: [{ id: "effects-page", title: "Text effects", notes: "Private effect notes", bg: "#ffffff", els: [
    makeEl("text", canvas, { id: "effect-text", x: 100, y: 100, w: 440, fontSize: 52, fontWeight: 700, text: EFFECT_TEXT, fill: "#6e2bd1", lineHeight: 1.4 }),
  ] }] };
  await page.evaluate(async design => { const key = (await window.designTestStorage.keys())[0], library = JSON.parse(await window.designTestStorage.getItem(key)); await window.designTestStorage.setItem(key, JSON.stringify(library.map((item: { id: string }) => item.id === design.id ? design : item))); }, design);
  await page.reload(); await expect(page.getByTestId("page")).toBeVisible(); await waitForDesignSave(page); await settledFonts(page); await selectEffectsText(page); return id;
}
export async function selectEffectsText(page: Page, editing = false) {
  const canvas = page.getByTestId("page"), box = await canvas.boundingBox(); if (!box) throw Error("Missing canvas");
  const point = { x: box.x + box.width * 150 / 800, y: box.y + box.height * 120 / 600 };
  if (editing) await page.mouse.dblclick(point.x, point.y); else await page.mouse.click(point.x, point.y);
}
export async function effectElement(page: Page) {
  const id = page.url().split("/").at(-1), design = (await fileLibrary(page)).find(d => d.id === id); if (!design) throw Error("Open design missing"); return designPages(design)[0].els[0];
}
export async function openEffects(page: Page) {
  const panel = page.getByRole("region", { name: "Text effects", exact: true });
  if (!await panel.isVisible()) await page.getByRole("button", { name: "Effects", exact: true }).click(); return panel;
}
export async function captureEffects(page: Page, viewport: string, variant: string, state: string) {
  await settledFonts(page); await page.mouse.move(0, 0);
  const panel = page.getByRole("region", { name: "Text effects", exact: true });
  const metrics = await page.evaluate(() => {
    const read = (node: Element) => { const b = node.getBoundingClientRect(), s = getComputedStyle(node); return { x: b.x, y: b.y, w: b.width, h: b.height, font: s.font, color: s.color, padding: s.padding, gap: s.gap, radius: s.borderRadius, shadow: s.boxShadow }; };
    const panel = document.querySelector('.cv-effects'), svg = document.querySelector('[data-testid="page"]')!, selection = svg.querySelector('[data-testid="selection"] > rect');
    return { viewport: { w: innerWidth, h: innerHeight }, documentWidth: document.documentElement.scrollWidth, panel: panel && read(panel), container: panel && read(panel.closest("aside")!),
      styles: Array.from(document.querySelectorAll('.cv-effect-grid button'), node => ({ label: node.getAttribute('aria-label'), pressed: node.getAttribute('aria-pressed'), ...read(node) })),
      canvas: read(svg), effect: svg.querySelector('[data-text-effect]')?.getAttribute('data-text-effect') ?? null,
      selection: selection && { x: selection.getAttribute('x'), y: selection.getAttribute('y'), w: selection.getAttribute('width'), h: selection.getAttribute('height') } };
  });
  const result = { viewport, variant, state, metrics, aria: await panel.isVisible() ? await panel.ariaSnapshot() : await page.getByTestId("page").ariaSnapshot() };
  if (process.env.CI) console.log("PARITY_TEXT_EFFECTS " + JSON.stringify({ ...result, png: (await page.screenshot()).toString("base64") })); return result;
}
