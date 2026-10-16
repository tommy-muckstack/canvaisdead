import { expect, type Page } from "@playwright/test";

/** Click the canvas at the measured text position, including the unpainted gap between lines. */
export async function textCanvasPoint(page: Page, glyph = false) {
  const target = page.getByTestId("page").locator(glyph ? "text tspan" : "text").first();
  const point = await target.evaluate(text => {
    const box = text.getBoundingClientRect(), canvas = document.querySelector('[data-testid="page"]')!;
    const x = box.x + box.width / 2, y = box.y + box.height / 2, hit = document.elementFromPoint(x, y), area = canvas.getBoundingClientRect();
    return { x, y, canvasX: x - area.x, canvasY: y - area.y, canvasHit: !!hit && canvas.contains(hit), textHit: !!hit && (hit === text || text.contains(hit)), tag: hit?.tagName, label: hit?.getAttribute("aria-label") };
  });
  expect(point.canvasHit, `Text interaction point is covered: ${JSON.stringify(point)}`).toBe(true);
  if (process.env.CI) console.log("PARITY_TEXT_TARGET " + JSON.stringify({ viewport: page.viewportSize(), glyph, ...point }));
  return point;
}

export async function captureTextSpacing(page: Page, viewport: string, state: "controls" | "edited") {
  await page.evaluate(() => document.fonts.ready);
  const metrics = await page.getByTestId("page").evaluate(canvas => {
    const text = canvas.querySelector("text")!, outline = canvas.querySelector('[data-testid="selection"] rect')!, style = getComputedStyle(text);
    const box = (node: Element) => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
    return { canvas: box(canvas), text: box(text), selection: box(outline), lines: Array.from(text.querySelectorAll("tspan"), line => ({ text: line.textContent, box: box(line) })), style: { font: style.font, letterSpacing: style.letterSpacing, fill: style.fill } };
  });
  const png = await page.screenshot({ fullPage: true });
  if (process.env.CI) console.log("PARITY_TEXT_CAPTURE " + JSON.stringify({ viewport, state, metrics, png: png.toString("base64") }));
}
