import { expect, type Page } from "@playwright/test";
import { waitForDesignSave } from "../../tests/e2e/fixtures";

export async function createPresentationDeck(page: Page) {
  await page.goto("/canvaisdead/login");
  await page.getByRole("button", { name: "Use the demo account" }).click();
  await expect(page.getByTestId("designs")).toBeVisible();
  await page.locator(".cx-qc").getByRole("button", { name: "Presentation", exact: true }).click();
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await page.getByLabel("Notes for page 1").fill("Private speaker note");
  await page.getByRole("button", { name: "Close notes", exact: true }).click();
  await page.getByRole("button", { name: "Add page", exact: true }).click();
  await waitForDesignSave(page);
  return page.url();
}

export async function capturePresentation(page: Page, viewport: string, variant: "before" | "after", mode: "standard" | "presenter" | "audience") {
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
  const root = page.getByRole("main", { name: "Presentation", exact: true });
  const metrics = await root.evaluate(node => {
    const details = (element: Element) => {
      const rect = element.getBoundingClientRect(), css = getComputedStyle(element);
      return { x: rect.x, y: rect.y, w: rect.width, h: rect.height, display: css.display, font: css.font, color: css.color, padding: css.padding, gap: css.gap, radius: css.borderRadius, shadow: css.boxShadow };
    };
    const footer = node.querySelector("footer")!, live = node.querySelector(".cv-live-toggle")!;
    return { root: details(node), footer: details(footer), live: details(live), page: (node.querySelector('[aria-label="Go to page"]') as HTMLInputElement).value, previousDisabled: (node.querySelector('[aria-label="Previous page"]') as HTMLButtonElement).disabled, fullscreen: !!document.fullscreenElement, controls: Array.from(footer.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement>("button,input,select"), control => ({ label: control.getAttribute("aria-label") ?? control.closest("label")?.textContent, disabled: control.disabled, visible: !!control.getClientRects().length, ...details(control) })) };
  });
  const aria = await root.ariaSnapshot(), png = await page.screenshot({ fullPage: true });
  if (process.env.CI) console.log("PARITY_PRESENTATION_CAPTURE " + JSON.stringify({ viewport, variant, mode, metrics, aria, png: png.toString("base64") }));
  return metrics;
}
