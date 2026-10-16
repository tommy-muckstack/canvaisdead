import { readFile } from "node:fs/promises";
import { expect, type Page, waitForDesignSave } from "../../tests/e2e/fixtures";
import { blankDesign, makeEl } from "../../lib/design/ops";
import type { Design } from "../../lib/design/types";
import { setupFileMenu, fileLibrary } from "./file-menu-evidence";
export { fileLibrary };

export const FONT_BODY = "Parity delayed body", FONT_HEADING = "Parity delayed heading";
export async function setupFontLayout(page: Page) {
  const id = await setupFileMenu(page), canvas = blankDesign({ w: 800, h: 600 });
  const design: Design = { id, name: "Font loading", w: 800, h: 600, updatedAt: 1, pages: [{ id: "font-page", title: "Typography", bg: "#fff", notes: "Private notes", els: [
    makeEl("text", canvas, { id: "body", x: 80, y: 80, w: 270, text: "iiiiiiiiii iiiiiiiiii iiiiiiiiii iiiiiiiiii", fontFamily: `"${FONT_BODY}", monospace`, fontSize: 36, fontWeight: 400, lineHeight: 1.4 }),
    makeEl("text", canvas, { id: "heading", x: 420, y: 80, w: 270, text: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM", fontFamily: `"${FONT_HEADING}", monospace`, fontSize: 30, fontWeight: 700, lineHeight: 1.4, fill: "#7d2ae8" }),
  ] }] };
  await page.evaluate(async design => { const key = (await window.designTestStorage.keys())[0], library = JSON.parse(await window.designTestStorage.getItem(key)); await window.designTestStorage.setItem(key, JSON.stringify(library.map((item: { id: string }) => item.id === design.id ? design : item))); }, design);
  await page.reload(); await expect(page.getByTestId("page")).toBeVisible(); await waitForDesignSave(page); await settledFonts(page);
  return id;
}
export async function settledFonts(page: Page) {
  await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
}
/** Native font loading with one explicitly held same-origin response; no layout mocks. */
export async function delayedFont(page: Page, family: string, fail = false) {
  const bytes = await readFile("vendor/isdead-design/fonts/canva/PlusJakartaSans-Variable.woff2");
  const url = `/canvaisdead/__parity-font-${family === FONT_BODY ? "body" : "heading"}.woff2`;
  let release!: () => void, requested!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; }), started = new Promise<void>(resolve => { requested = resolve; });
  await page.route(`**${url}`, async route => { requested(); await gate; if (fail) await route.abort("failed"); else await route.fulfill({ body: bytes, contentType: "font/woff2" }); });
  const face = await page.evaluateHandle(({ family, url }) => { const face = new FontFace(family, `url("${url}")`, { weight: "100 900", display: "swap" }); document.fonts.add(face); void face.load().catch(() => {}); return face; }, { family, url });
  await started; await expect.poll(() => page.evaluate(() => document.fonts.status)).toBe("loading");
  return async () => {
    release(); await settledFonts(page); await expect.poll(() => face.evaluate(font => font.status)).toBe(fail ? "error" : "loaded");
    if (process.env.CI) console.log("PARITY_FONT_FACE " + JSON.stringify(await face.evaluate(font => ({ family: font.family, status: font.status }))));
    await face.dispose();
  };
}
export async function selectFontBody(page: Page) {
  const svg = page.getByTestId("page"), box = await svg.boundingBox(); if (!box) throw Error("Canvas is not visible");
  await page.mouse.click(box.x + 140 * box.width / 800, box.y + 100 * box.height / 600);
  const selected = svg.getByTestId("selection"); await expect(selected).toBeVisible();
  await expect(selected.locator(":scope > rect").first()).toHaveAttribute("x", "80");
}
export async function fontMetrics(page: Page) {
  return page.evaluate(() => {
    const read = (node: Element) => { const bounds = node.getBoundingClientRect(), style = getComputedStyle(node); return { x: bounds.x, y: bounds.y, w: bounds.width, h: bounds.height, font: style.font, lineHeight: style.lineHeight, letterSpacing: style.letterSpacing, color: style.color }; };
    const texts = (selector: string) => Array.from(document.querySelectorAll<SVGTextElement>(selector), node => ({ ...read(node), lines: Array.from(node.querySelectorAll<SVGTSpanElement>("tspan"), line => ({ text: line.textContent, x: line.getAttribute("x"), y: line.getAttribute("y"), length: line.getComputedTextLength() })) }));
    const selection = document.querySelector('[data-testid="selection"] > rect');
    return { viewport: { w: innerWidth, h: innerHeight }, documentWidth: document.documentElement.scrollWidth, canvas: texts('[data-testid="page"] text'), thumbnails: texts('.cv-page-thumb text'), layers: texts('.cv-layer-preview text'), selection: selection ? { ...read(selection), height: Number(selection.getAttribute("height")), transform: selection.parentElement?.getAttribute("transform") } : null };
  });
}
export async function captureFontLayout(page: Page, viewport: string, variant: string, state: string) {
  await settledFonts(page); await page.mouse.move(0, 0);
  const result = { viewport, variant, state, metrics: await fontMetrics(page), aria: await page.getByTestId("page").ariaSnapshot() };
  if (process.env.CI) console.log("PARITY_FONT_LAYOUT " + JSON.stringify({ ...result, png: (await page.screenshot()).toString("base64") }));
  return result;
}
