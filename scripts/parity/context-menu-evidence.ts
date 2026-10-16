import type { Page } from "@playwright/test";

export async function captureContextMenu(page: Page, viewport: string, variant: "before" | "after") {
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
  const menu = page.getByRole("menu", { name: "Canvas actions", exact: true });
  const metrics = await menu.evaluate(node => {
    const details = (element: Element) => {
      const rect = element.getBoundingClientRect(), css = getComputedStyle(element);
      return { x: rect.x, y: rect.y, w: rect.width, h: rect.height, font: css.font, color: css.color, padding: css.padding, gap: css.gap, radius: css.borderRadius, shadow: css.boxShadow };
    };
    return { menu: details(node), controls: Array.from(node.querySelectorAll("button"), button => ({ label: button.querySelector("span")?.textContent, shortcut: button.querySelector("kbd")?.textContent ?? null, disabled: button.disabled, focused: document.activeElement === button, labelledBy: button.getAttribute("aria-labelledby"), describedBy: button.getAttribute("aria-describedby"), ...details(button) })) };
  });
  const aria = await menu.ariaSnapshot(), png = await page.screenshot({ fullPage: true });
  if (process.env.CI) console.log("PARITY_CONTEXT_MENU_CAPTURE " + JSON.stringify({ viewport, variant, metrics, aria, png: png.toString("base64") }));
  return { metrics, aria };
}
