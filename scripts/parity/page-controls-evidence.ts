import type { Page } from "@playwright/test";

export async function pageControlMetrics(page: Page) {
  return page.getByRole("group", { name: "Page actions", exact: true }).evaluate(row => {
    const box = (node: Element) => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
    const toolbar = document.querySelector(".cv-ctx")!, canvas = document.querySelector('[data-testid="page"]')!;
    const style = getComputedStyle(row);
    const controls = Array.from(row.querySelectorAll<HTMLInputElement | HTMLButtonElement>("button, input")).map(control => {
      const rect = control.getBoundingClientRect(), target = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return { name: control.getAttribute("aria-label") || control.textContent, disabled: control.disabled, box: box(control), reachable: target === control || !!target && control.contains(target) };
    });
    return { row: box(row), toolbar: box(toolbar), canvas: box(canvas), controls, style: { font: style.font, padding: style.padding, gap: style.gap, radius: style.borderRadius, wrap: style.flexWrap } };
  });
}

export async function capturePageControls(page: Page, viewport: string, stage: "before" | "after") {
  await page.evaluate(() => document.fonts.ready);
  const metrics = await pageControlMetrics(page), png = await page.screenshot({ fullPage: true });
  if (process.env.CI) console.log("PARITY_PAGE_CONTROLS_CAPTURE " + JSON.stringify({ viewport, stage, metrics, png: png.toString("base64") }));
  return metrics;
}
