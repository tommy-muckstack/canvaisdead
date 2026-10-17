import { expect, type Page } from "../../tests/e2e/fixtures";
import { openProjects } from "./library-layout-evidence";
import { fileLibrary } from "./file-menu-evidence";
import { blankDesign, makeEl } from "../../lib/design/ops";
import type { Design } from "../../lib/design/types";
export { fileLibrary };
export const FAVORITE = "Favorite presentation", OTHER = "Unstarred poster";
export async function setupStars(page: Page) {
  await openProjects(page); const canvas = blankDesign({ w: 800, h: 600 });
  const designs: Design[] = [
    { id: "favorite-design", name: FAVORITE, w: 800, h: 600, updatedAt: 1792108800000, pages: [
      { id: "favorite-cover", title: "Cover", notes: "Private favorite notes", bg: "#e9e1ff", els: [makeEl("text", canvas, { id: "favorite-text", text: "Keep the good ideas", x: 70, y: 100, w: 650, fontSize: 64, fill: "#6e2bd1", link: { kind: "page", pageId: "favorite-details" } })] },
      { id: "favorite-details", title: "Details", bg: "#00c4cc", els: [] },
    ] },
    { ...blankDesign({ w: 600, h: 800 }, OTHER), id: "other-design", updatedAt: 1792022400000, bg: "#ffe7d8", els: [makeEl("text", canvas, { id: "other-text", text: "More room for ideas", x: 70, y: 160, w: 420, fontSize: 54, fill: "#a83a1a" })] },
  ];
  await page.evaluate(async designs => { const key = (await window.designTestStorage.keys())[0]; await window.designTestStorage.setItem(key, JSON.stringify(designs)); }, designs);
  await page.reload(); await expect(page.getByRole("link", { name: `Open ${FAVORITE}`, exact: true })).toBeVisible(); await page.evaluate(() => document.fonts.ready);
}
export async function favoriteSaved(page: Page, value = true) { await expect.poll(async () => !!(await fileLibrary(page)).find(d => d.id === "favorite-design")?.starred).toBe(value); }
export async function captureStars(page: Page, viewport: string, variant: "before" | "after", state: string) {
  await page.evaluate(() => document.fonts.ready); await page.mouse.move(0, 0); await page.locator(".cx-main").evaluateAll(nodes => nodes.forEach(node => node.scrollTo(0, 0)));
  const metrics = await page.evaluate(() => {
    const read = (node: Element) => { const b = node.getBoundingClientRect(), s = getComputedStyle(node); return { x: b.x, y: b.y, w: b.width, h: b.height, font: s.font, color: s.color, padding: s.padding, gap: s.gap, radius: s.borderRadius, shadow: s.boxShadow }; };
    const visible = (node: Element) => node.getClientRects().length > 0;
    return { viewport: { w: innerWidth, h: innerHeight }, documentWidth: document.documentElement.scrollWidth,
      controls: Array.from(document.querySelectorAll('.cx-empty>a.cx-btn,.cv-projects .cv-psearch button,.cd-star,.cv-project-star,.cv-project-more,.cd-project-tabs a,.cx-proj__nav>a[href*="/app/projects"]')).filter(visible).map(node => { const b = node.getBoundingClientRect(), hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return { label: node.getAttribute("aria-label") || node.textContent, pressed: node.getAttribute("aria-pressed"), receivesPointer: !!hit && node.contains(hit), ...read(node) }; }),
      recovery: Array.from(document.querySelectorAll(".cv-save-notice button")).filter(visible).map(node => { const b = node.getBoundingClientRect(), hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return { label: node.textContent, receivesPointer: !!hit && node.contains(hit), ...read(node) }; }),
      panels: Array.from(document.querySelectorAll(".cv-projects,.cd-menu,.cx-starred-nav,.cx-proj__main")).filter(visible).map(node => ({ kind: node.className, ...read(node) })) };
  });
  const root = page.locator(".cx-proj,.cv").first();
  if (process.env.CI) console.log("PARITY_STARS " + JSON.stringify({ viewport, variant, state, metrics, aria: await root.ariaSnapshot(), png: (await page.screenshot()).toString("base64") })); return metrics;
}
