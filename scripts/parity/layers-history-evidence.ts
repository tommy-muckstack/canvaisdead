import { expect, type Page } from "@playwright/test";
import { blankDesign, makeEl } from "../../lib/design/ops";

export function layerHistoryFixture() {
  const d = blankDesign({ w: 800, h: 600 });
  return [
    makeEl("rect", d, { id: "a", x: 100, y: 100, w: 200, h: 120, fill: "#ff5757" }),
    makeEl("ellipse", d, { id: "b", x: 150, y: 140, w: 120, h: 80, fill: "#00c4cc" }),
    makeEl("text", d, { id: "c", x: 500, y: 400, w: 200, text: "Caption", fontSize: 24 }),
    makeEl("triangle", d, { id: "d", x: 600, y: 100, w: 120, h: 80, locked: true }),
  ];
}

/** Real mouse events at both viewport sizes; this does not claim physical touch coverage. */
export async function startRectangleLayerDrag(page: Page) {
  const list = page.getByRole("list", { name: "Design layers" });
  const source = list.locator('[data-layer-key="element:a"]').getByRole("button", { name: "Move Rectangle" });
  const destination = list.locator('[data-layer-key="element:c"]');
  await source.scrollIntoViewIfNeeded();
  const a = (await source.boundingBox())!, c = (await destination.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
  await page.mouse.move(c.x + c.width / 2, c.y + 3, { steps: 8 });
  await expect(destination).toHaveAttribute("data-drop", "before");
}

export async function captureLayersHistory(page: Page, viewport: string, variant: "before" | "after", state: "undo" | "redo", order: string[]) {
  await page.evaluate(() => document.fonts.ready); await page.mouse.move(0, 0);
  const button = page.getByRole("button", { name: "Position", exact: true });
  const metrics = await button.evaluate(node => {
    const details = (element: Element) => {
      const box = element.getBoundingClientRect(), css = getComputedStyle(element);
      return { x: box.x, y: box.y, w: box.width, h: box.height, font: css.font, color: css.color, padding: css.padding, gap: css.gap, radius: css.borderRadius, shadow: css.boxShadow };
    };
    const panel = document.getElementById("editor-panel")!, box = node.getBoundingClientRect();
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return { button: { ...details(node), expanded: node.getAttribute("aria-expanded"), hitAtCenter: hit && { tag: hit.tagName, className: hit.getAttribute("class"), text: hit.textContent?.slice(0, 80) }, receivesPointer: !!hit && (node === hit || node.contains(hit)) },
      panel: { ...details(panel), hidden: panel.hidden, scrollTop: panel.scrollTop },
      selectedTab: panel.querySelector('[role="tab"][aria-selected="true"]')?.textContent ?? null,
      visibleRows: Array.from(panel.querySelectorAll<HTMLElement>("[data-layer-key]")).filter(row => row.getClientRects().length).map(row => row.dataset.layerKey) };
  });
  const positionVisible = await page.getByRole("region", { name: "Position", exact: true }).isVisible();
  const templateSearchVisible = await page.getByRole("textbox", { name: "Search templates", exact: true }).isVisible();
  const observation = { viewport, variant, state, order, metrics, positionVisible, templateSearchVisible, aria: await page.locator("#editor-panel").ariaSnapshot() };
  if (process.env.CI) console.log("PARITY_LAYERS_HISTORY " + JSON.stringify({ ...observation, png: (await page.screenshot()).toString("base64") }));
  return observation;
}
