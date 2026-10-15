import { expect, test, type Page } from "@playwright/test";
import type { El } from "@/lib/design/types";
import { blankDesign, makeEl } from "@/lib/design/ops";

const doc = blankDesign({ w: 800, h: 600 });
const fixture = [
  makeEl("rect", doc, { id: "a", x: 100, y: 120, w: 100, h: 80, fill: "#ff5757" }),
  makeEl("ellipse", doc, { id: "b", x: 400, y: 300, w: 160, h: 100, fill: "#00c4cc" }),
  makeEl("text", doc, { id: "c", x: 140, y: 450, w: 220, fontSize: 30, text: "Selection test" }),
  makeEl("rect", doc, { id: "locked", x: 650, y: 80, w: 90, h: 90, fill: "#ffaa00", locked: true }),
];
async function saved(page: Page): Promise<El[]> {
  const id = page.url().split("/").at(-1)!;
  return page.evaluate(id => {
    const key = Object.keys(localStorage).find(key => key.endsWith(":designs"))!;
    const design = JSON.parse(localStorage.getItem(key)!).find((item: { id: string }) => item.id === id);
    return design.pages ? design.pages[0].els : design.els;
  }, id);
}
async function point(page: Page, x: number, y: number) {
  const box = (await page.getByTestId("page").boundingBox())!;
  return { x: box.x + x * box.width / 800, y: box.y + y * box.height / 600 };
}
async function selectPair(page: Page) {
  const canvas = page.getByTestId("page");
  await canvas.locator('rect[fill="#ff5757"]').click();
  await canvas.locator('ellipse[fill="#00c4cc"]').click({ modifiers: ["Shift"] });
  await expect(page.getByTestId("multi-selection")).toHaveAttribute("data-count", "2");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/canvaisdead/login");
  await page.getByRole("button", { name: "Use the demo account" }).click();
  await expect(page.getByTestId("designs")).toBeVisible();
  await page.locator(".cx-qc").getByRole("button", { name: "Presentation", exact: true }).click();
  await expect(page.getByTestId("page")).toBeVisible();
  const id = page.url().split("/").at(-1)!;
  await page.evaluate(({ id, fixture }) => {
    const key = Object.keys(localStorage).find(key => key.endsWith(":designs"))!;
    const designs = JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(key, JSON.stringify(designs.map((design: { id: string }) => design.id === id ? { ...design, w: 800, h: 600, els: fixture } : design)));
  }, { id, fixture });
  await page.reload(); await expect(page.getByTestId("page")).toBeVisible();
  if (await page.getByRole("button", { name: "Hide side panel", exact: true }).isVisible()) await page.getByRole("button", { name: "Hide side panel", exact: true }).click();
});

test("shift selection, keyboard bulk edits, undo and reload preserve content and locks", async ({ page }, testInfo) => {
  await selectPair(page);
  await page.keyboard.press("Shift+ArrowRight");
  await expect.poll(async () => (await saved(page)).slice(0, 2).map(e => e.x)).toEqual([110, 410]);
  await page.keyboard.press("ControlOrMeta+d");
  await expect.poll(async () => (await saved(page)).length).toBe(6);
  await expect(page.getByTestId("multi-selection")).toHaveAttribute("data-count", "2");
  await page.screenshot({ path: testInfo.outputPath("multi-duplicate.png") });
  await page.keyboard.press("Delete");
  await expect.poll(async () => (await saved(page)).length).toBe(4);
  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(async () => (await saved(page)).length).toBe(6);
  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(async () => (await saved(page)).length).toBe(4);
  await page.reload(); await expect(page.getByTestId("page")).toBeVisible();
  expect((await saved(page)).slice(0, 2).map(e => e.x)).toEqual([110, 410]);
  await page.getByTestId("page").focus(); await page.keyboard.press("ControlOrMeta+a");
  await expect(page.getByTestId("multi-selection")).toHaveAttribute("data-count", "3");
  await page.keyboard.press("Delete");
  await expect.poll(async () => (await saved(page)).map(e => e.id)).toEqual(["locked"]);
  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(async () => (await saved(page)).length).toBe(4);
  await page.getByTestId("page").focus(); await page.keyboard.press("ControlOrMeta+a");
  await expect(page.getByTestId("multi-selection")).toHaveAttribute("data-count", "3");
  await page.getByRole("button", { name: "Add page", exact: true }).click();
  await expect(page.getByLabel("Page count", { exact: true })).toHaveText("2 / 2");
  await expect(page.getByTestId("multi-selection")).toHaveCount(0);
});

test("marquee and dragging move the selection once while Escape cancels the next gesture", async ({ page }, testInfo) => {
  const start = await point(page, 90, 110), end = await point(page, 580, 420);
  await page.mouse.move(start.x, start.y); await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 5 }); await page.mouse.up();
  await expect(page.getByTestId("multi-selection")).toHaveAttribute("data-count", "2");
  const from = await point(page, 150, 160), to = await point(page, 230, 200);
  await page.keyboard.down("Alt");
  await page.mouse.move(from.x, from.y); await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 5 }); await page.mouse.up();
  await page.keyboard.up("Alt");
  await expect.poll(async () => (await saved(page)).slice(0, 2).map(e => [Math.round(e.x), Math.round(e.y)])).toEqual([[180, 160], [480, 340]]);
  const moved = await saved(page);
  await page.mouse.move(to.x, to.y); await page.mouse.down();
  await page.mouse.move(to.x + 30, to.y + 20, { steps: 3 });
  await page.keyboard.press("Escape"); await page.mouse.up();
  expect(await saved(page)).toEqual(moved);
  await page.screenshot({ path: testInfo.outputPath("multi-after-cancel.png") });
  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(async () => (await saved(page)).slice(0, 2).map(e => [e.x, e.y])).toEqual([[100, 120], [400, 300]]);
});

test("selection mode supports tapping and bulk lock protection without a keyboard", async ({ page }, testInfo) => {
  const canvas = page.getByTestId("page");
  const tap = async (selector: string) => testInfo.project.use.hasTouch ? canvas.locator(selector).tap() : canvas.locator(selector).click();
  await page.getByRole("button", { name: "Select multiple", exact: true }).click();
  await tap('rect[fill="#ff5757"]'); await tap('ellipse[fill="#00c4cc"]');
  await expect(page.getByTestId("multi-selection")).toHaveAttribute("data-count", "2");
  await tap('rect[fill="#ff5757"]'); await expect(page.getByTestId("multi-selection")).toHaveCount(0);
  await tap('rect[fill="#ff5757"]');
  await page.getByRole("button", { name: "Done selecting", exact: true }).click();
  await page.getByRole("button", { name: "Lock selection", exact: true }).click();
  await expect(page.locator("[data-multi-handle]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Delete selection", exact: true })).toBeDisabled();
  const locked = await saved(page);
  await canvas.focus(); await page.keyboard.press("ArrowRight"); await page.keyboard.press("Delete");
  expect(await saved(page)).toEqual(locked);
  await page.getByRole("button", { name: "Unlock selection", exact: true }).click();
  await expect(page.locator("[data-multi-handle]")).toHaveCount(5);
  await page.getByRole("button", { name: "Delete selection", exact: true }).click();
  await expect.poll(async () => (await saved(page)).map(e => e.id)).toEqual(["c", "locked"]);
});

test("multi-selection handles scale proportionally and rotate with one undo step each", async ({ page }) => {
  await selectPair(page);
  const handle = (await page.locator('[data-multi-handle="se"]').boundingBox())!;
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2); await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2 + 40, handle.y + handle.height / 2 + 20, { steps: 5 }); await page.mouse.up();
  const resized = await saved(page), factor = resized[0].w / fixture[0].w;
  expect(factor).toBeGreaterThan(1); expect(resized[1].w / fixture[1].w).toBeCloseTo(factor);
  const rotate = (await page.locator('[data-multi-handle="rotate"]').boundingBox())!;
  await page.mouse.move(rotate.x + rotate.width / 2, rotate.y + rotate.height / 2); await page.mouse.down();
  await page.mouse.move(rotate.x + rotate.width / 2 + 50, rotate.y + rotate.height / 2 - 30, { steps: 5 }); await page.mouse.up();
  expect((await saved(page))[0].rotation).not.toBe(0);
  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(() => saved(page)).toEqual(resized);
  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(() => saved(page)).toEqual(fixture);
});
