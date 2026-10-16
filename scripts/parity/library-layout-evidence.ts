import { expect, type Page } from "@playwright/test";

export async function openProjects(page: Page) {
  await page.goto("/canvaisdead/login");
  await page.getByRole("button", { name: "Use the demo account" }).click();
  await expect(page.getByTestId("designs")).toBeVisible();
  await page.goto("/canvaisdead/app/projects");
  await expect(page.getByTestId("designs").locator(".cd-card").first()).toBeVisible();
}

export async function emptyProjects(page: Page) {
  const cards = page.getByTestId("designs").locator(".cd-card");
  for (let count = await cards.count(); count > 0; count--) {
    await cards.first().getByRole("button", { name: /^More options for / }).click();
    await page.getByRole("menuitem", { name: "Move to Trash", exact: true }).click();
    await expect(cards).toHaveCount(count - 1);
  }
  await expect(page.getByRole("heading", { name: "All your content and your team's content will live here", exact: true })).toBeVisible();
}

export async function measureLibraryLayout(page: Page) {
  await page.evaluate(() => document.fonts.ready); await page.mouse.move(0, 0);
  const root = page.locator(".cx-proj");
  return root.evaluate(node => {
    const details = (element: Element) => {
      const rect = element.getBoundingClientRect(), css = getComputedStyle(element);
      return { x: rect.x, y: rect.y, w: rect.width, h: rect.height, font: css.font, color: css.color, padding: css.padding, gap: css.gap, radius: css.borderRadius, shadow: css.boxShadow, position: css.position };
    };
    const badge = node.querySelector(".cx-try")!, main = node.querySelector(".cx-proj__main")!;
    const links = Array.from(node.querySelectorAll<HTMLAnchorElement>('a[href*="/app/projects"]')).filter(link => link.getClientRects().length).map(link => {
      const rect = link.getBoundingClientRect(), hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return { label: link.textContent, current: link.getAttribute("aria-current"), receivesPointer: !!hit && link.contains(hit), hitTag: hit?.tagName, hitClass: hit?.getAttribute("class"), ...details(link) };
    });
    const scrollport = node.closest(".cx-main")!;
    const content = Array.from(main.querySelectorAll(".cx-try, .cd-project-search, .cv-design-files__actions>button, .cx-filt>span, .cd-card, .cd-more, .cx-empty")).map(element => ({ label: element.getAttribute("aria-label") || element.textContent?.trim().slice(0,80) || element.className, ...details(element) }));
    return { badge: details(badge), main: details(main), heading: details(node.querySelector("h1")!), links, content, scrollport: { ...details(scrollport), clientWidth: scrollport.clientWidth, scrollWidth: scrollport.scrollWidth }, viewport: { width: window.innerWidth, height: window.innerHeight }, documentWidth: document.documentElement.scrollWidth };
  });
}

export async function captureLibraryLayout(page: Page, viewport: string, variant: "before" | "after", view: "projects" | "trash" | "projects-empty") {
  const metrics = await measureLibraryLayout(page), root = page.locator(".cx-proj");
  const aria = await root.ariaSnapshot(), png = await page.screenshot({ fullPage: true });
  if (process.env.CI) console.log("PARITY_LIBRARY_LAYOUT " + JSON.stringify({ viewport, variant, view, metrics, aria, png: png.toString("base64") }));
  return metrics;
}
