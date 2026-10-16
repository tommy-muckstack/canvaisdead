import type { Page } from "@playwright/test";

export type DropObservation = {
  clientX: number; clientY: number; trusted: boolean; types: string[];
  box: { x: number; y: number; width: number; height: number };
  viewBox: { x: number; y: number; width: number; height: number };
  matrix: { a: number; b: number; c: number; d: number; e: number; f: number } | null;
};
type DropWindow = Window & { parityCanvasDrops?: DropObservation[] };

/** Observe the event before React handles it; never replace or mutate a drop. */
export async function observeCanvasDrops(page: Page) {
  await page.getByTestId("page").evaluate(element => {
    const svg = element as SVGSVGElement, observed: DropObservation[] = [];
    (window as DropWindow).parityCanvasDrops = observed;
    svg.addEventListener("drop", event => {
      const box = svg.getBoundingClientRect(), view = svg.viewBox.baseVal, matrix = svg.getScreenCTM();
      observed.push({ clientX: event.clientX, clientY: event.clientY, trusted: event.isTrusted, types: Array.from(event.dataTransfer?.types ?? []),
        box: { x: box.x, y: box.y, width: box.width, height: box.height },
        viewBox: { x: view.x, y: view.y, width: view.width, height: view.height },
        matrix: matrix && { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d, e: matrix.e, f: matrix.f } });
    }, { capture: true });
  });
}

export const observedCanvasDrops = (page: Page) => page.evaluate(() => (window as DropWindow).parityCanvasDrops ?? []);

export async function captureDropEvidence(page: Page, viewport: string, scenario: string, requested: { clientX: number; clientY: number }[], centers: { x: number; y: number }[]) {
  const observations = await observedCanvasDrops(page);
  const metrics = { viewport, scenario, requested, observations, centers };
  if (process.env.CI) {
    console.log("PARITY_CANVAS_DROP " + JSON.stringify({ kind: "observation", ...metrics }));
    await page.evaluate(() => document.fonts.ready); await page.mouse.move(0, 0);
    console.log("PARITY_CANVAS_DROP " + JSON.stringify({ kind: "capture", viewport, scenario, png: (await page.screenshot()).toString("base64") }));
  }
  return observations;
}
