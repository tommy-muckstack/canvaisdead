import type { Page } from "@playwright/test";

export async function captureCreatePicker(page: Page, viewport: string, variant: "before" | "after", state: "search" | "custom") {
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
  const dialog = page.getByRole("dialog", { name: "Create a design", exact: true });
  const metrics = await dialog.evaluate(node => {
    const details = (element: Element) => {
      const rect = element.getBoundingClientRect(), css = getComputedStyle(element);
      return { x: rect.x, y: rect.y, w: rect.width, h: rect.height, font: css.font, color: css.color, padding: css.padding, gap: css.gap, radius: css.borderRadius, shadow: css.boxShadow };
    };
    return { dialog: details(node), controls: Array.from(node.querySelectorAll("input,select"), control => ({ tag: control.tagName, value: (control as HTMLInputElement).value, labelledBy: control.getAttribute("aria-labelledby"), label: Array.from((control as HTMLInputElement).labels ?? [], label => label.textContent), ...details(control) })) };
  });
  const aria = await dialog.ariaSnapshot(), png = await page.screenshot({ fullPage: true });
  if (process.env.CI) console.log("PARITY_CREATE_CAPTURE " + JSON.stringify({ viewport, variant, state, metrics, aria, png: png.toString("base64") }));
}

export async function recordCreateDismissal(page: Page, viewport: string, variant: "before" | "after") {
  const state = await page.evaluate(() => {
    const dialog = document.querySelector<HTMLDialogElement>("dialog.cx-create");
    const search = dialog?.querySelector<HTMLInputElement>('input[type="search"]');
    return { mounted: !!dialog, open: dialog?.open ?? false, query: search?.value ?? null, focused: document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.tagName };
  });
  if (process.env.CI) console.log("PARITY_CREATE_ESCAPE " + JSON.stringify({ viewport, variant, ...state }));
  return state;
}

export async function recordCreateFocus(page: Page, viewport: string, variant: "before" | "after", direction: "backward" | "forward") {
  const state = await page.getByRole("dialog", { name: "Create a design", exact: true }).evaluate(node => {
    const active = document.activeElement, inside = node.contains(active);
    return { inside, focused: inside ? active?.getAttribute("aria-label") ?? active?.textContent?.trim() ?? null : active?.tagName ?? null, tag: active?.tagName };
  });
  if (process.env.CI) console.log("PARITY_CREATE_FOCUS " + JSON.stringify({ viewport, variant, direction, ...state }));
  return state;
}
