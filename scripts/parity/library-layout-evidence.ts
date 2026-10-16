import { expect, type Page } from "@playwright/test";

export async function openProjects(page: Page) {
  await page.goto("/canvaisdead/login");
  await page.getByRole("button", { name: "Use the demo account" }).click();
  await expect(page.getByTestId("designs")).toBeVisible();
  await page.goto("/canvaisdead/app/projects");
  await expect(page.getByTestId("designs").locator(".cd-card").first()).toBeVisible();
}

export async function captureLibraryLayout(page: Page, viewport: string, variant: "before" | "after", view: "projects" | "trash") {
  await page.evaluate(() => document.fonts.ready); await page.mouse.move(0, 0);
  const root = page.locator(".cx-proj");
  const metrics = await root.evaluate(node => {
    const details = (element: Element) => {
      const rect = element.getBoundingClientRect(), css = getComputedStyle(element);
      return { x: rect.x, y: rect.y, w: rect.width, h: rect.height, font: css.font, color: css.color, padding: css.padding, gap: css.gap, radius: css.borderRadius, shadow: css.boxShadow, position: css.position };
    };
    const badge = node.querySelector(".cx-try")!, main = node.querySelector(".cx-proj__main")!;
    const links = Array.from(node.querySelectorAll<HTMLAnchorElement>('a[href*="/app/projects"]')).filter(link => link.getClientRects().length).map(link => {
      const rect = link.getBoundingClientRect(), hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return { label: link.textContent, current: link.getAttribute("aria-current"), receivesPointer: !!hit && link.contains(hit), hitTag: hit?.tagName, hitClass: hit?.getAttribute("class"), ...details(link) };
    });
    return { badge: details(badge), main: details(main), heading: details(node.querySelector("h1")!), links, viewport: { width: window.innerWidth, height: window.innerHeight }, documentWidth: document.documentElement.scrollWidth };
  });
  const aria = await root.ariaSnapshot(), png = await page.screenshot({ fullPage: true });
  if (process.env.CI) console.log("PARITY_LIBRARY_LAYOUT " + JSON.stringify({ viewport, variant, view, metrics, aria, png: png.toString("base64") }));
  return metrics;
}
