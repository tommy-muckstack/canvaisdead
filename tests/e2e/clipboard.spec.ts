import { waitForDesignSave } from "./fixtures";
import { expect, test, type Page } from "./fixtures";
import type { El } from "@/lib/design/types";
import { blankDesign, makeEl } from "@/lib/design/ops";
import { groupElements } from "@/lib/design/groups";

declare global { interface Window { finishClipboardWrite?: () => void } }
const pixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN2QAAAAASUVORK5CYII=";
const doc = blankDesign({ w: 800, h: 600 });
doc.els = [
  makeEl("rect", doc, { id: "a", x: 80, y: 100, w: 100, h: 80, fill: "#ff5757" }),
  makeEl("text", doc, { id: "b", x: 300, y: 200, w: 300, text: "Portable text 👋", fontSize: 30, italic: true }),
  makeEl("image", doc, { id: "c", x: 100, y: 400, w: 100, h: 100, src: pixel }),
];
const fixture = groupElements(doc, ["a", "b"], null, "group-original").els;
async function saved(page: Page, pageIndex = 0): Promise<El[]> {
  const id = page.url().split("/").at(-1)!;
  return page.evaluate(async ({ id, pageIndex }) => {
    const key = (await window.designTestStorage.keys()).find(key => key.endsWith(":designs"))!;
    const design = JSON.parse((await window.designTestStorage.getItem(key))).find((d: { id: string }) => d.id === id);
    return design.pages ? design.pages[pageIndex].els : design.els;
  }, { id, pageIndex });
}
async function selectGroup(page: Page) {
  await page.getByTestId("page").locator('rect[fill="#ff5757"]').first().click();
  await expect(page.getByTestId("multi-selection")).toHaveAttribute("data-count", "2");
}
test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/canvaisdead/login"); await page.getByRole("button", { name: "Use the demo account" }).click();
  await expect(page.getByTestId("designs")).toBeVisible();
  await page.locator(".cx-qc").getByRole("button", { name: "Presentation", exact: true }).click();
  await expect(page.getByTestId("page")).toBeVisible();
  const id = page.url().split("/").at(-1)!;
  await page.evaluate(async ({ id, fixture }) => {
    const key = (await window.designTestStorage.keys()).find(key => key.endsWith(":designs"))!;
    const designs = JSON.parse((await window.designTestStorage.getItem(key)));
    await window.designTestStorage.setItem(key, JSON.stringify(designs.map((d: { id: string }) => d.id === id ? { ...d, w: 800, h: 600, els: fixture } : d)));
  }, { id, fixture });
  await waitForDesignSave(page); await page.reload(); await expect(page.getByTestId("page")).toBeVisible();
  if (await page.getByRole("button", { name: "Hide side panel", exact: true }).isVisible()) await page.getByRole("button", { name: "Hide side panel", exact: true }).click();
});

test("native clipboard preserves groups across pages and designs, with one-step undo", async ({ page }, testInfo) => {
  await selectGroup(page); await page.keyboard.press("ControlOrMeta+c");
  expect(await page.evaluate(async () => navigator.clipboard.readText())).toBe("Portable text 👋");
  await page.keyboard.press("ControlOrMeta+v");
  await expect.poll(async () => (await saved(page)).length).toBe(5);
  const copied = (await saved(page)).slice(3);
  expect(copied.map(e => [e.x, e.y])).toEqual([[104, 124], [324, 224]]);
  expect(copied[0].groupPath).toEqual(copied[1].groupPath); expect(copied[0].groupPath).not.toEqual(["group-original"]);
  await page.keyboard.press("ControlOrMeta+z"); await expect.poll(() => saved(page)).toEqual(fixture);
  await page.getByRole("button", { name: "Add page", exact: true }).click();
  await page.getByTestId("page").focus(); await page.keyboard.press("ControlOrMeta+v");
  await expect.poll(async () => (await saved(page, 1)).length).toBe(2);
  expect((await saved(page, 1)).map(e => [e.x, e.y])).toEqual([[80, 100], [300, 200]]);
  await page.screenshot({ path: testInfo.outputPath("clipboard-group-page.png") });
  await page.goto("/canvaisdead/app"); await page.getByRole("button", { name: "Create a design", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Logo 500 × 500 px", exact: true }).click();
  await expect(page.getByTestId("page")).toBeVisible();
  await page.getByTestId("page").focus(); await page.keyboard.press("ControlOrMeta+v");
  await expect.poll(async () => (await saved(page)).length).toBe(2);
  expect((await saved(page)).map(e => e.w)).toEqual([100, 300]);
  await waitForDesignSave(page); await page.reload(); await expect(page.getByTestId("page")).toBeVisible();
  expect((await saved(page))[1]).toMatchObject({ text: "Portable text 👋", italic: true });
});

test("failed and delayed menu cuts preserve originals while a native cut is undoable", async ({ page }) => {
  await selectGroup(page);
  await page.evaluate(async () => { Object.defineProperty(navigator.clipboard, "write", { configurable: true, value: async () => { throw new DOMException("Denied", "NotAllowedError"); } }); });
  await page.getByRole("button", { name: "More selection actions", exact: true }).click();
  await page.getByRole("menuitem", { name: /^Cut/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "Clipboard access is unavailable" })).toBeVisible();
  expect(await saved(page)).toEqual(fixture);
  await page.evaluate(async () => { Object.defineProperty(navigator.clipboard, "write", { configurable: true, value: () => new Promise<void>(resolve => { window.finishClipboardWrite = resolve; }) }); });
  await page.getByRole("button", { name: "More selection actions", exact: true }).click();
  await page.getByRole("menuitem", { name: /^Cut/ }).click();
  await page.getByRole("button", { name: "Add page", exact: true }).click();
  await page.evaluate(async () => window.finishClipboardWrite?.());
  await expect(page.getByRole("status").filter({ hasText: "nothing was cut" })).toBeVisible();
  expect(await saved(page)).toEqual(fixture);
  await page.getByRole("tab", { name: "Page 1", exact: true }).click();
  await selectGroup(page); await page.keyboard.press("ControlOrMeta+x");
  await expect.poll(async () => (await saved(page)).map(e => e.id)).toEqual(["c"]);
  await page.keyboard.press("ControlOrMeta+z"); await expect.poll(() => saved(page)).toEqual(fixture);
});

test("plain text and raster images paste locally while native text fields keep normal paste", async ({ page }) => {
  await page.evaluate(async () => navigator.clipboard.writeText("Literal <b>text</b>\nSecond line 👋"));
  await page.getByTestId("page").focus(); await page.keyboard.press("ControlOrMeta+v");
  await expect.poll(async () => (await saved(page)).length).toBe(4);
  expect((await saved(page))[3].text).toBe("Literal <b>text</b>\nSecond line 👋");
  await page.evaluate(async () => navigator.clipboard.writeText("Name from clipboard"));
  const name = page.getByRole("textbox", { name: "Design name", exact: true });
  await name.focus(); await page.keyboard.press("ControlOrMeta+a"); await page.keyboard.press("ControlOrMeta+v");
  await expect(name).toHaveValue("Name from clipboard"); expect((await saved(page)).length).toBe(4);
  await page.evaluate(async pixel => {
    const bytes = Uint8Array.from(atob(pixel.split(",")[1]), c => c.charCodeAt(0));
    await navigator.clipboard.write([new ClipboardItem({ "image/png": new Blob([bytes], { type: "image/png" }) })]);
  }, pixel);
  await page.getByTestId("page").focus(); await page.keyboard.press("ControlOrMeta+v");
  await expect.poll(async () => (await saved(page)).length).toBe(5);
  expect((await saved(page))[4]).toMatchObject({ type: "image", w: 1, h: 1 });
  expect((await saved(page))[4].src).toMatch(/^data:image\/png;base64,/);
});

test("canvas actions support right-click, keyboard navigation and viewport bounds", async ({ page }, testInfo) => {
  await selectGroup(page); await page.getByTestId("page").focus(); await page.keyboard.press("Shift+F10");
  const menu = page.getByRole("menu", { name: "Canvas actions" });
  await expect(menu).toBeVisible(); await expect(menu.getByRole("menuitem", { name: /^Copy/ })).toBeFocused();
  await page.keyboard.press("End"); await expect(menu.getByRole("menuitem", { name: /^Select all/ })).toBeFocused();
  await page.keyboard.press("Home"); await page.keyboard.press("ArrowDown"); await expect(menu.getByRole("menuitem", { name: /^Cut/ })).toBeFocused();
  await page.keyboard.press("Escape"); await expect(menu).toHaveCount(0); await expect(page.getByTestId("page")).toBeFocused();
  await page.getByTestId("page").locator('rect[fill="#ff5757"]').click({ button: "right" });
  const bounds = (await menu.boundingBox())!, viewport = page.viewportSize()!;
  expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width); expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
  await page.screenshot({ path: testInfo.outputPath("canvas-context-menu.png") });
  await menu.getByRole("menuitem", { name: /^Ungroup/ }).click();
  await expect.poll(async () => (await saved(page)).every(e => !e.groupPath)).toBe(true);
});
