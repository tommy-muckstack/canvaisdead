import { expect, test } from "@playwright/test";

const targets = [
  { app: "original", surface: "home", url: "https://www.canva.com/" },
  { app: "clone", surface: "home", url: "https://canvaisdead.vercel.app/canvaisdead" },
  { app: "original", surface: "login", url: "https://www.canva.com/login" },
  { app: "clone", surface: "login", url: "https://canvaisdead.vercel.app/canvaisdead/login" },
];
const publicURL = (value: string) => { const url = new URL(value); return url.origin + url.pathname; };

for (const target of targets) test(`${target.app} ${target.surface}: public reference capture`, async ({ page }, info) => {
  let status: number | null = null, navigationError: string | null = null, networkSettled = false;
  try { status = (await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 30_000 }))?.status() ?? null; }
  catch (error) { navigationError = error instanceof Error ? error.message.match(/net::ERR_[A-Z_]+/)?.[0] ?? error.name : "Navigation failed"; }
  try { await page.waitForLoadState("networkidle", { timeout: 10_000 }); networkSettled = true; } catch { /* Record the unsettled page; never treat this as a visual match. */ }
  await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 2000))]));
  const observed = await page.evaluate(() => {
    const visible = (element: Element) => { const box = element.getBoundingClientRect(), css = getComputedStyle(element); return box.width > 0 && box.height > 0 && css.visibility !== "hidden" && css.display !== "none"; };
    const elements = Array.from(document.querySelectorAll("header, nav, main, footer, h1, h2, h3, button, a, input, label, [role=dialog]")).filter(visible).slice(0,250).map(element => {
      const rect = element.getBoundingClientRect(), css = getComputedStyle(element);
      return { tag: element.tagName, role: element.getAttribute("role"), label: element.getAttribute("aria-label"), text: element.textContent?.trim().replace(/\s+/g," ").slice(0,160), x: rect.x, y: rect.y, w: rect.width, h: rect.height, font: css.font, lineHeight: css.lineHeight, letterSpacing: css.letterSpacing, color: css.color, backgroundColor: css.backgroundColor, gradient: /^(linear|radial)-gradient/.test(css.backgroundImage) ? css.backgroundImage : null, padding: css.padding, margin: css.margin, gap: css.gap, radius: css.borderRadius, shadow: css.boxShadow };
    });
    const text = document.body.innerText;
    return { title: document.title, viewport: { width: innerWidth, height: innerHeight }, document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }, fontsLoaded: document.fonts.status === "loaded", challenge: /verify (you are|you're) human|checking your browser|just a moment|access denied|vercel authentication|security checkpoint/i.test(document.title + "\n" + text.slice(0,3000)), textExcerpt: text.slice(0,3000), elements };
  });
  const aria = (await page.locator("body").ariaSnapshot()).slice(0,30_000);
  const emit = (kind: string, data: Record<string, unknown>) => console.log("PARITY_PUBLIC_REFERENCE " + JSON.stringify({ app: target.app, surface: target.surface, viewport: info.project.name, kind, ...data }));
  emit("observation", { requestedURL: target.url, finalURL: publicURL(page.url()), status, navigationError, networkSettled, observed, aria, capturedAt: new Date().toISOString() });
  emit("viewport", { png: (await page.screenshot({ timeout: 15_000 })).toString("base64") });
  // Bound capture size. A taller page is explicitly incomplete, never silently cropped.
  if (observed.document.height <= 20_000) {
    emit("full-page", { png: (await page.screenshot({ fullPage: true, timeout: 15_000 })).toString("base64") });
  } else emit("full-page-skipped", { reason: "Document exceeds the 20,000px capture bound", height: observed.document.height });
  expect(navigationError, "Navigation must succeed before this is usable reference evidence").toBeNull();
  expect(status, "Record challenge/error pages without treating them as the requested surface").toBe(200);
  expect(observed.challenge, "No challenge bypass is attempted").toBe(false);
  expect(observed.textExcerpt.trim().length).toBeGreaterThan(20);
});
