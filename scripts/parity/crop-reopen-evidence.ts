import { expect, type Page } from "@playwright/test";
import type { El } from "../../lib/design/types";

declare global { interface Window { cropReopenEvent?: { x: number; y: number; trusted: boolean; image: boolean } } }

/** Inspect the clipped source and use a normal, native double-click on its visible frame. */
export async function reopenVisibleCrop(page: Page, element: El) {
  const canvas = page.getByTestId("page"), source = canvas.locator("image").first();
  await canvas.scrollIntoViewIfNeeded();
  let defaultTargetReady = true;
  try { await source.dblclick({ trial: true, timeout: 1500 }); }
  catch (error) {
    if (!(error instanceof Error) || error.name !== "TimeoutError") throw error;
    defaultTargetReady = false;
  }
  // Read the same native content quad used by Chromium's locator actionability.
  const session = await page.context().newCDPSession(page);
  let quads: number[][];
  try {
    const { root } = await session.send("DOM.getDocument", { depth: 0 });
    const { nodeId } = await session.send("DOM.querySelector", { nodeId: root.nodeId, selector: '[data-testid="page"] image' });
    ({ quads } = await session.send("DOM.getContentQuads", { nodeId }));
  } finally { await session.detach(); }
  const geometry = await canvas.evaluate((node, { element, quads }) => {
    const root = node as SVGSVGElement, image = root.querySelector("image")!, clip = image.ownerSVGElement!, matrix = root.getScreenCTM()!;
    const rect = (value: DOMRect) => ({ x: value.x, y: value.y, w: value.width, h: value.height });
    const hit = (point: { x: number; y: number }) => {
      const target = document.elementFromPoint(point.x, point.y);
      return { tag: target?.tagName ?? null, isImage: target === image, className: target?.getAttribute("class") ?? null };
    };
    // Match the installed Chromium locator's viewport-clamped quad centroid.
    const clipped = quads.map(quad => Array.from({ length: 4 }, (_, i) => ({ x: Math.max(0, Math.min(innerWidth, quad[i * 2])), y: Math.max(0, Math.min(innerHeight, quad[i * 2 + 1])) })));
    const quad = clipped.find(points => Math.abs(points.reduce((area, p, i) => { const next = points[(i + 1) % 4]; return area + (p.x * next.y - next.x * p.y) / 2; }, 0)) > .99);
    const defaultPoint = quad ? { x: quad.reduce((sum, p) => sum + p.x, 0) / 4, y: quad.reduce((sum, p) => sum + p.y, 0) / 4 } : null;
    const center = new DOMPoint(element.x + element.w / 2, element.y + element.h / 2).matrixTransform(matrix);
    const frameCenter = { x: center.x, y: center.y }, box = root.getBoundingClientRect();
    return { viewport: { w: innerWidth, h: innerHeight }, canvas: rect(box), source: { box: rect(image.getBoundingClientRect()), bounds: rect(image.getBBox()), quads },
      clip: { x: clip.x.baseVal.value, y: clip.y.baseVal.value, w: clip.width.baseVal.value, h: clip.height.baseVal.value, viewBox: clip.getAttribute("viewBox"), overflow: getComputedStyle(clip).overflow },
      matrix: { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d, e: matrix.e, f: matrix.f },
      frame: { x: element.x, y: element.y, w: element.w, h: element.h, rotation: element.rotation, crop: element.imageCrop },
      defaultPoint, defaultHit: defaultPoint && hit(defaultPoint), frameCenter, frameHit: hit(frameCenter), offset: { x: center.x - box.x, y: center.y - box.y } };
  }, { element, quads });
  expect(geometry.frameHit.isImage).toBe(true);
  await page.evaluate(() => {
    window.cropReopenEvent = undefined;
    document.addEventListener("dblclick", event => {
      window.cropReopenEvent = { x: event.clientX, y: event.clientY, trusted: event.isTrusted, image: event.target instanceof SVGImageElement };
    }, { once: true, capture: true });
  });
  await canvas.dblclick({ position: geometry.offset });
  await expect(page.getByTestId("image-crop")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Crop aspect ratio" })).toBeVisible();
  const event = await page.evaluate(() => window.cropReopenEvent);
  expect(event).toMatchObject({ trusted: true, image: true });
  expect(Math.abs(event!.x - geometry.frameCenter.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(event!.y - geometry.frameCenter.y)).toBeLessThanOrEqual(1);
  return { defaultTargetReady, geometry, event };
}

export async function captureCropReopen(page: Page, viewport: string, state: "reopened" | "reset", details: Record<string, unknown>) {
  await page.evaluate(() => document.fonts.ready); await page.mouse.move(0, 0);
  const subject = state === "reopened" ? page.getByRole("region", { name: "Image crop settings", exact: true }) : page.getByTestId("page");
  const control = await subject.evaluate(node => {
    const box = node.getBoundingClientRect(), css = getComputedStyle(node);
    return { x: box.x, y: box.y, w: box.width, h: box.height, font: css.font, color: css.color, padding: css.padding, radius: css.borderRadius, shadow: css.boxShadow };
  });
  const observation = { viewport, state, variant: process.env.PARITY_CROP_CAPTURE === "before" ? "before" : "after", control, aria: await subject.ariaSnapshot(), details };
  if (process.env.CI) console.log("PARITY_CROP_REOPEN " + JSON.stringify({ ...observation, png: (await page.screenshot()).toString("base64") }));
}
