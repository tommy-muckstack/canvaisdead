import { expect, type Page } from "@playwright/test";

export const elementLibrary = (page: Page) => page.getByRole("region", { name: "Elements library", exact: true });

export async function prepareElementFilters(page: Page) {
  const trigger = page.getByRole("navigation", { name: "Tools" }).getByRole("button", { name: "Elements", exact: true });
  await trigger.click(); await expect(elementLibrary(page)).toBeVisible();
  await elementLibrary(page).getByRole("region", { name: "Shapes", exact: true }).getByRole("button", { name: "Add rectangle", exact: true }).click();
  await trigger.click(); await expect(elementLibrary(page)).toBeVisible();
  await elementLibrary(page).getByRole("button", { name: "Filters", exact: true }).click();
  await expect(elementLibrary(page).locator(".cv-element-filters")).toBeVisible();
}

export async function captureElementFilters(page: Page, viewport: string, variant: "before" | "after", state: "default" | "filtered") {
  const library = elementLibrary(page), filters = library.locator(".cv-element-filters");
  // Normalize focus and scroll for visual comparison without changing filter state.
  await library.getByRole("button", { name: /^Filters(?: \(\d\))?$/ }).click();
  await library.getByRole("button", { name: /^Filters(?: \(\d\))?$/ }).click();
  await page.locator(".cv-panel").evaluate(node => node.scrollTo({ top: 0, left: 0 }));
  await page.evaluate(() => document.fonts.ready); await page.mouse.move(0, 0);
  const controls = await filters.locator("select").evaluateAll(nodes => nodes.map(node => {
    const select = node as HTMLSelectElement, box = select.getBoundingClientRect(), css = getComputedStyle(select);
    return { labels: Array.from(select.labels ?? [], label => label.textContent), labelledBy: select.getAttribute("aria-labelledby"), labelledText: select.getAttribute("aria-labelledby")?.split(/\s+/).map(id => document.getElementById(id)?.textContent), value: select.value,
      options: Array.from(select.options, option => ({ value: option.value, text: option.text, selected: option.selected })),
      x: box.x, y: box.y, w: box.width, h: box.height, font: css.font, color: css.color, padding: css.padding, gap: css.gap, radius: css.borderRadius, shadow: css.boxShadow, outline: css.outline };
  }));
  const aria = await filters.ariaSnapshot(), exactLabelMatches = { color: await library.getByLabel("Color", { exact: true }).count(), orientation: await library.getByLabel("Orientation", { exact: true }).count() };
  const capture = { viewport, variant, state, controls, aria, exactLabelMatches };
  if (process.env.CI) console.log("PARITY_ELEMENT_FILTERS " + JSON.stringify({ ...capture, png: (await page.screenshot()).toString("base64") }));
  return capture;
}
