import { expect, type Page, waitForDesignSave } from "../../tests/e2e/fixtures";
import { openProjects } from "./library-layout-evidence";
import { fileLibrary } from "./file-menu-evidence";
import { blankDesign, makeEl } from "../../lib/design/ops";
import { designPages } from "../../lib/design/pages";
import type { Design } from "../../lib/design/types";
import { isDesignLibrary } from "../../lib/design/validate";
export { fileLibrary };
export const TARGET = "Working design", SOURCE = "Source pages", SINGLE = "Single page";
export async function setupProjectPages(page: Page, filled = false, count = 1) {
  await openProjects(page); const canvas = blankDesign({ w: 400, h: 300 });
  const designs: Design[] = [
    { id: "page-target", name: TARGET, w: 800, h: 600, updatedAt: 1792108800000, starred: true, pages: Array.from({ length: count }, (_, i) => ({ id: `target-${i}`, title: "", bg: "#ffffff", els: filled && i === 0 ? [makeEl("text", canvas, { id: "original", text: "Keep my original", x: 80, y: 100, w: 600, fontSize: 48 })] : [] })) },
    { id: "page-source", name: SOURCE, w: 400, h: 300, updatedAt: 1792022400000, starred: true, pages: [
      { id: "source-intro", title: "Intro", notes: "Source introduction notes", bg: "#e9e1ff", els: [makeEl("text", canvas, { id: "source-title", text: "Reusable intro", x: 40, y: 60, w: 320, fontSize: 40, fill: "#6e2bd1", link: { kind: "page", pageId: "source-details" } })] },
      { id: "source-details", title: "Details", notes: "Source details notes", bg: "#d4fbf2", els: [makeEl("text", canvas, { id: "source-detail-text", text: "Reusable details", x: 40, y: 60, w: 320, fontSize: 36, fill: "#17634f", link: { kind: "url", url: "https://example.com/story" } })] },
    ] },
    { ...blankDesign({ w: 600, h: 800 }, SINGLE), id: "page-single", updatedAt: 1791936000000, bg: "#ffe7d8", els: [makeEl("text", canvas, { id: "single-title", text: "Poster copy", x: 60, y: 160, w: 480, fontSize: 60, fill: "#a83a1a" })] },
  ];
  expect(isDesignLibrary(designs)).toBe(true);
  await page.evaluate(async designs => { await window.designTestStorage.setItem((await window.designTestStorage.keys())[0], JSON.stringify(designs)); }, designs);
  await page.reload(); await page.getByRole("link", { name: `Open ${TARGET}`, exact: true }).click(); await expect(page.getByTestId("page")).toBeVisible(); await waitForDesignSave(page); return designs;
}
export const targetDesign = async (page: Page) => (await fileLibrary(page)).find(d => d.id === "page-target")!;
export const targetPages = async (page: Page) => designPages(await targetDesign(page));
export async function projectPanel(page: Page) {
  const panel = page.getByRole("region", { name: "Projects panel", exact: true });
  if (!await panel.isVisible()) await page.getByRole("button", { name: "Projects", exact: true }).click();
  await expect(panel).toBeVisible(); return panel;
}
export async function sourcePages(page: Page) {
  const panel = await projectPanel(page); await panel.getByRole("button", { name: `View pages of ${SOURCE}`, exact: true }).click();
  await expect(panel.getByRole("heading", { name: SOURCE, exact: true })).toBeFocused(); return panel;
}
export const choice = (page: Page) => page.getByRole("dialog", { name: "Use pages from this design?", exact: true });
export async function captureProjectPages(page: Page, viewport: string, variant: "before" | "after", state: string) {
  await page.evaluate(() => document.fonts.ready); await page.mouse.move(0, 0);
  const metrics = await page.evaluate(() => {
    const read = (node: Element) => { const b = node.getBoundingClientRect(), s = getComputedStyle(node); return { x: b.x, y: b.y, w: b.width, h: b.height, font: s.font, color: s.color, padding: s.padding, gap: s.gap, radius: s.borderRadius, shadow: s.boxShadow }; };
    const visible = (node: Element) => node.getClientRects().length > 0;
    return { viewport: { w: innerWidth, h: innerHeight }, documentWidth: document.documentElement.scrollWidth,
      controls: Array.from(document.querySelectorAll(".cv-projects button,.cv-projects a,.cv-project-choice button,.cv-save-notice button")).filter(visible).map(node => { const b = node.getBoundingClientRect(), hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return { label: node.getAttribute("aria-label") || node.textContent, disabled: (node as HTMLButtonElement).disabled ?? false, receivesPointer: !!hit && node.contains(hit), ...read(node) }; }),
      panels: Array.from(document.querySelectorAll(".cv-projects,.cv-project-choice")).filter(visible).map(node => ({ kind: node.className, ...read(node) })) };
  });
  if (process.env.CI) console.log("PARITY_PROJECT_PAGES " + JSON.stringify({ viewport, variant, state, metrics, aria: await page.locator(".cv").ariaSnapshot(), png: (await page.screenshot()).toString("base64") }));
  return metrics;
}
