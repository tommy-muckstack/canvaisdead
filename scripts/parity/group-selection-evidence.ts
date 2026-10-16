import { expect, type Page } from "@playwright/test";

/** Inspect the default target before clicking an unobstructed point on the text. */
export async function selectGroupText(page: Page, viewport: string) {
  const text = page.getByTestId("page").locator("text");
  let defaultTargetReady = true;
  try { await text.click({ modifiers: ["Shift"], trial: true, timeout: 1500 }); }
  catch (error) {
    if (!(error instanceof Error) || error.name !== "TimeoutError") throw error;
    defaultTargetReady = false;
  }
  const geometry = await text.evaluate(node => {
    const box = node.getBoundingClientRect();
    const rect = (value: DOMRect) => ({ x: value.x, y: value.y, w: value.width, h: value.height });
    const hit = (x: number, y: number) => {
      const target = document.elementFromPoint(x, y);
      return { tag: target?.tagName ?? null, text: target === node || !!target && node.contains(target), handle: target?.closest("[data-multi-handle]")?.getAttribute("data-multi-handle") ?? null };
    };
    const point = { x: box.x + box.width * .15, y: box.y + box.height / 2 };
    const handle = document.querySelector('[data-multi-handle="rotate"]');
    return { text: rect(box), defaultPoint: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
      defaultHit: hit(box.x + box.width / 2, box.y + box.height / 2), handle: handle && rect(handle.getBoundingClientRect()),
      point, pointHit: hit(point.x, point.y), offset: { x: box.width * .15, y: box.height / 2 } };
  });
  expect(geometry.pointHit.text).toBe(true);
  await captureGroup(page, viewport, "selection", { defaultTargetReady, geometry });
  const observed = page.evaluate(() => new Promise<{ trusted: boolean; shift: boolean; text: boolean; x: number; y: number }>(resolve => {
    document.addEventListener("pointerdown", event => {
      const text = document.querySelector('[data-testid="page"] text');
      resolve({ trusted: event.isTrusted, shift: event.shiftKey, text: event.target === text || !!text?.contains(event.target as Node), x: event.clientX, y: event.clientY });
    }, { once: true, capture: true });
  }));
  await text.click({ modifiers: ["Shift"], position: geometry.offset });
  const input = await observed;
  if (process.env.CI) console.log("PARITY_GROUP_INPUT " + JSON.stringify({ viewport, input, geometry }));
  expect(input).toMatchObject({ trusted: true, shift: true, text: true });
  expect(Math.abs(input.x - geometry.point.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(input.y - geometry.point.y)).toBeLessThanOrEqual(1);
  await expect(page.getByTestId("multi-selection")).toHaveAttribute("data-count", "3");
}

export async function captureGroup(page: Page, viewport: string, state: string, details: Record<string, unknown>) {
  await page.evaluate(() => document.fonts.ready); await page.mouse.move(0, 0);
  const toolbar = page.locator('[aria-label="Element toolbar"]');
  const styles = await toolbar.evaluate(node => {
    const box = node.getBoundingClientRect(), css = getComputedStyle(node);
    return { x: box.x, y: box.y, w: box.width, h: box.height, font: css.font, color: css.color, padding: css.padding, radius: css.borderRadius, shadow: css.boxShadow };
  });
  const observation = { viewport, state, variant: process.env.PARITY_GROUP_CAPTURE === "before" ? "before" : "after", details,
    styles, aria: await toolbar.ariaSnapshot() };
  if (process.env.CI) console.log("PARITY_GROUP_SELECTION " + JSON.stringify({ ...observation, png: (await page.screenshot()).toString("base64") }));
}
