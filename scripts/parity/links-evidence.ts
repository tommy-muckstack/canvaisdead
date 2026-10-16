import { expect, type Page, waitForDesignSave } from "../../tests/e2e/fixtures";
import { blankDesign, makeEl } from "../../lib/design/ops";
import type { Design } from "../../lib/design/types";
import { fileLibrary, setupFileMenu } from "./file-menu-evidence";
import { settledFonts } from "./font-layout-evidence";
export { fileLibrary };
export const LINK_URL = "https://example.test/reference?view=design#details";
export async function setupLinks(page: Page) {
  const id = await setupFileMenu(page), canvas = blankDesign({ w: 800, h: 600 });
  const design: Design = { id, name: "Linked design", w: 800, h: 600, updatedAt: 1, pages: [
    { id: "link-start", title: "Start", notes: "Private link notes", bg: "#ffffff", els: [
      makeEl("text", canvas, { id: "link-text", text: "Explore the details", x: 100, y: 100, w: 560, fontSize: 44, fill: "#6e2bd1" }),
      makeEl("rect", canvas, { id: "link-shape", x: 100, y: 300, w: 220, h: 120, fill: "#00c4cc" }),
      makeEl("image", canvas, { id: "link-image", x: 440, y: 300, w: 120, h: 120, src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1sAAAAASUVORK5CYII=" }),
    ] }, { id: "link-details", title: "Details", notes: "", bg: "#f2eaff", els: [makeEl("text", canvas, { id: "detail-text", text: "You found the details", x: 100, y: 100, w: 600, fontSize: 44 })] },
  ] };
  await page.evaluate(async design => { const key = (await window.designTestStorage.keys())[0], library = JSON.parse(await window.designTestStorage.getItem(key)); await window.designTestStorage.setItem(key, JSON.stringify(library.map((item: { id: string }) => item.id === design.id ? design : item))); }, design);
  await page.reload(); await expect(page.getByTestId("page")).toBeVisible(); await waitForDesignSave(page); await settledFonts(page); await selectLinkedElement(page, "text"); return id;
}
export async function selectLinkedElement(page: Page, type: "text" | "shape" | "image") {
  const box = await page.getByTestId("page").boundingBox(); if (!box) throw Error("Missing canvas");
  const [x, y] = type === "text" ? [180, 120] : type === "shape" ? [210, 360] : [500, 360];
  await page.mouse.click(box.x + box.width * x / 800, box.y + box.height * y / 600);
}
export async function openElementLink(page: Page) { await page.getByRole("button", { name: "Link", exact: true }).click(); const dialog = page.getByRole("dialog", { name: "Link", exact: true }); await expect(dialog).toBeVisible(); return dialog; }
export async function setWebsiteLink(page: Page, url = LINK_URL) { const dialog = await openElementLink(page); await dialog.getByRole("textbox", { name: "Enter a link or search", exact: true }).fill(url); await dialog.getByRole("button", { name: "Done", exact: true }).click(); await waitForDesignSave(page); }
export async function captureLinks(page: Page, viewport: string, variant: "before" | "after", state: string) {
  await settledFonts(page); await page.mouse.move(0, 0);
  const metrics = await page.evaluate(() => {
    const read = (node: Element | null) => { if (!node) return null; const b = node.getBoundingClientRect(), s = getComputedStyle(node); return { x: b.x, y: b.y, w: b.width, h: b.height, font: s.font, color: s.color, padding: s.padding, gap: s.gap, radius: s.borderRadius, shadow: s.boxShadow }; };
    return { viewport: { w: innerWidth, h: innerHeight }, documentWidth: document.documentElement.scrollWidth, panel: read(document.querySelector(".cv-link-popover")), toolbar: read(document.querySelector(".cv-float")), controls: Array.from(document.querySelectorAll(".cv-link-popover button,.cv-link-popover input,.cv-link-popover a"), node => ({ label: node.getAttribute("aria-label") ?? node.textContent, ...read(node) })), links: Array.from(document.querySelectorAll(".cv-artwork-link"), node => ({ href: node.getAttribute("href"), label: node.getAttribute("aria-label"), ...read(node) })) };
  });
  const dialog = page.getByRole("dialog", { name: "Link", exact: true }), root = await dialog.isVisible() ? dialog : page.locator(".cv,.cv-present").first();
  if (process.env.CI) console.log("PARITY_LINKS " + JSON.stringify({ viewport, variant, state, metrics, aria: await root.ariaSnapshot(), png: (await page.screenshot()).toString("base64") })); return metrics;
}
