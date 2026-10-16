import { expect, type Page, waitForDesignSave } from "../../tests/e2e/fixtures";
import { blankDesign, makeEl } from "../../lib/design/ops";
import type { Design } from "../../lib/design/types";
import { setupFileMenu, fileLibrary } from "./file-menu-evidence";
import { settledFonts } from "./font-layout-evidence";
export { fileLibrary };
export const LIST_TEXT = "First item wraps over several words\nSecond item\n\nFourth item";
export async function setupTextLists(page: Page) {
  const id = await setupFileMenu(page), canvas = blankDesign({ w: 800, h: 600 });
  const design: Design = { id, name: "Text lists", w: 800, h: 600, updatedAt: 1, pages: [{ id: "list-page", title: "List layout", notes: "Private list notes", bg: "#fff", els: [
    makeEl("text", canvas, { id: "list", x: 80, y: 80, w: 220, text: LIST_TEXT, fontSize: 28, fontWeight: 400, lineHeight: 1.4 }),
  ] }] };
  await page.evaluate(async design => { const key = (await window.designTestStorage.keys())[0], library = JSON.parse(await window.designTestStorage.getItem(key)); await window.designTestStorage.setItem(key, JSON.stringify(library.map((item: { id: string }) => item.id === design.id ? design : item))); }, design);
  await page.reload(); await expect(page.getByTestId("page")).toBeVisible(); await waitForDesignSave(page); await settledFonts(page); await selectListText(page);
  return id;
}
export async function selectListText(page: Page, edit = false) {
  const svg = page.getByTestId("page"), box = await svg.boundingBox(); if (!box) throw Error("Canvas missing");
  const x = box.x + 150 * box.width / 800, y = box.y + 95 * box.height / 600;
  if (edit) await page.mouse.dblclick(x, y); else { await page.mouse.click(x, y); await expect(svg.getByTestId("selection")).toBeVisible(); }
}
export async function chooseList(page: Page, name: "No list" | "Bulleted list" | "Numbered list") {
  await page.getByRole("button", { name: "List", exact: true }).click();
  await page.getByRole("menuitemradio", { name, exact: true }).click(); await waitForDesignSave(page);
}
export async function listMetrics(page: Page) {
  return page.evaluate(() => {
    const read = (node: Element) => { const b = node.getBoundingClientRect(), s = getComputedStyle(node); return { x: b.x, y: b.y, w: b.width, h: b.height, font: s.font, color: s.color, padding: s.padding, gap: s.gap, radius: s.borderRadius, shadow: s.boxShadow }; };
    const spans = (selector: string) => Array.from(document.querySelectorAll<SVGTSpanElement>(selector), node => ({ text: node.textContent, canvasX: Number(node.getAttribute("x")), canvasY: Number(node.getAttribute("y")), marker: node.getAttribute("text-anchor") === "end", ...read(node) }));
    const menu = document.querySelector('[role="menu"][aria-label="List style"]'), selected = document.querySelector('[data-testid="selection"] > rect');
    return { viewport: { w: innerWidth, h: innerHeight }, documentWidth: document.documentElement.scrollWidth, canvas: spans('[data-testid="page"] text tspan'), thumbnails: spans('.cv-page-thumb text tspan'),
      selection: selected ? { ...read(selected), height: Number(selected.getAttribute("height")) } : null,
      menu: menu && read(menu), items: menu && Array.from(menu.querySelectorAll("button"), read) };
  });
}
export async function captureTextLists(page: Page, viewport: string, variant: string, state: string) {
  await settledFonts(page); await page.mouse.move(0, 0);
  const menu = page.getByRole("menu", { name: "List style", exact: true });
  const result = { viewport, variant, state, metrics: await listMetrics(page), aria: await menu.count() ? await menu.ariaSnapshot() : await page.getByTestId("page").ariaSnapshot() };
  if (process.env.CI) console.log("PARITY_TEXT_LISTS " + JSON.stringify({ ...result, png: (await page.screenshot()).toString("base64") }));
  return result;
}
