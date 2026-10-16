import type { Page } from "@playwright/test";

export async function captureToolbar(page: Page, viewport: string, stage: "before" | "after") {
  await page.evaluate(() => document.fonts.ready);
  const metrics = await page.getByTestId("float-toolbar").evaluate(toolbar => {
    const box = (node: Element) => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
    const text = document.querySelector('[data-testid="page"] text')!, selection = document.querySelector('[data-testid="selection"] rect')!, style = getComputedStyle(toolbar), t = text.getBoundingClientRect();
    const target = document.elementFromPoint(t.x + t.width / 2, t.y + t.height / 2);
    return { toolbar: box(toolbar), text: box(text), selection: box(selection), textCenterTarget: target?.closest(".cv-float") ? "floating toolbar" : target?.tagName, style: { font: style.font, padding: style.padding, gap: style.gap, radius: style.borderRadius, shadow: style.boxShadow, wrap: style.flexWrap } };
  });
  const png = await page.screenshot({ fullPage: true });
  if (process.env.CI) console.log("PARITY_TOOLBAR_CAPTURE " + JSON.stringify({ viewport, stage, metrics, png: png.toString("base64") }));
  return metrics;
}
