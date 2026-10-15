import { expect, test, type Page } from "@playwright/test";
import type { El } from "@/lib/design/types";
import { blankDesign, makeEl } from "@/lib/design/ops";

const d = blankDesign({ w: 800, h: 600 });
const fixture = [
  makeEl("rect", d, { id: "a", x: 100, y: 80, w: 200, h: 100, fill: "#ff5757" }),
  makeEl("ellipse", d, { id: "b", x: 400, y: 220, w: 80, h: 160, fill: "#00c4cc" }),
  makeEl("text", d, { id: "c", x: 600, y: 420, w: 100, text: "Caption", fontSize: 20 }),
];
async function saved(page: Page): Promise<El[]> {
  const id = page.url().split("/").at(-1)!;
  return page.evaluate(id => { const key = Object.keys(localStorage).find(key => key.endsWith(":designs"))!, design = JSON.parse(localStorage.getItem(key)!).find((value: { id: string }) => value.id === id); return design.pages ? design.pages[0].els : design.els; }, id);
}
const panel = (page: Page) => page.getByRole("region", { name: "Position", exact: true });
async function open(page: Page) { await page.getByRole("button", { name: "Position", exact: true }).click(); await expect(panel(page)).toBeVisible(); return panel(page); }
async function field(page: Page, name: string, value: string) { const input = panel(page).getByRole("spinbutton", { name, exact: true }); await input.fill(value); await input.press("Enter"); }
async function close(page: Page) { await panel(page).getByRole("button", { name: "Close position" }).click(); }
test.beforeEach(async ({ page }) => {
  await page.goto("/canvaisdead/login");
  const cookies = page.getByRole("button", { name: "Accept all cookies" }); if (await cookies.isVisible()) await cookies.click();
  await page.getByRole("button", { name: "Use the demo account" }).click(); await expect(page.getByTestId("designs")).toBeVisible();
  await page.locator(".cx-qc").getByRole("button", { name: "Presentation", exact: true }).click(); await expect(page.getByTestId("page")).toBeVisible();
  const id = page.url().split("/").at(-1)!;
  await page.evaluate(({ id, fixture }) => { const key = Object.keys(localStorage).find(key => key.endsWith(":designs"))!, designs = JSON.parse(localStorage.getItem(key)!); localStorage.setItem(key, JSON.stringify(designs.map((design: { id: string }) => design.id === id ? { ...design, w: 800, h: 600, els: fixture } : design))); }, { id, fixture });
  await page.reload(); await expect(page.getByTestId("page")).toBeVisible();
  if (await page.getByRole("button", { name: "Hide side panel", exact: true }).isVisible()) await page.getByRole("button", { name: "Hide side panel", exact: true }).click();
  await page.getByTestId("page").locator('rect[fill="#ff5757"]').click();
});

test("exact fields validate, cancel, preserve ratio, undo and survive reload", async ({ page }, info) => {
  const controls = await open(page), width = controls.getByRole("spinbutton", { name: "Width", exact: true });
  await field(page, "Width", "320"); expect((await saved(page))[0]).toMatchObject({ w: 320, h: 100 });
  await width.fill("-1"); await expect(width).toHaveAttribute("aria-invalid", "true"); await width.press("Enter"); await expect(width).toHaveValue("320");
  await width.fill("500"); await width.press("Escape"); await expect(controls).toBeVisible(); await expect(width).toHaveValue("320");
  await width.press("Escape"); await expect(controls).toHaveCount(0); await expect(page.getByRole("button", { name: "Position", exact: true })).toBeFocused();
  await open(page); await controls.getByRole("button", { name: "Lock aspect ratio" }).click();
  await field(page, "Width", "160"); expect((await saved(page))[0]).toMatchObject({ w: 160, h: 50 });
  await field(page, "X", "125.5"); await field(page, "Y", "90.25");
  await field(page, "Rotate", "-45"); await expect(controls.getByRole("spinbutton", { name: "Rotate", exact: true })).toHaveValue("315");
  const edited = await saved(page); expect(edited[0]).toMatchObject({ w: 160, h: 50, x: 125.5, y: 90.25, rotation: 315 });
  await page.screenshot({ path: info.outputPath("position-advanced.png") }); await close(page);
  await page.getByTestId("page").focus(); await page.keyboard.press("ControlOrMeta+z"); await expect.poll(async () => (await saved(page))[0].rotation).toBe(0);
  expect((await saved(page))[0].w).toBe(160); await page.keyboard.press("ControlOrMeta+Shift+z"); await expect.poll(() => saved(page)).toEqual(edited);
  await page.reload(); await expect(page.getByTestId("page")).toBeVisible(); expect(await saved(page)).toEqual(edited);
});

test("clicking the canvas commits a field before a drag records its undo snapshot", async ({ page }) => {
  const controls = await open(page), width = controls.getByRole("spinbutton", { name: "Width", exact: true }); await width.fill("250");
  const shape = page.getByTestId("page").locator('rect[fill="#ff5757"]'), box = (await shape.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2 + 20);
  await expect(controls.getByRole("spinbutton", { name: "X", exact: true })).not.toHaveValue(String(fixture[0].x)); await page.mouse.up();
  await expect.poll(async () => (await saved(page))[0].w).toBe(250); expect((await saved(page))[0].x).not.toBe(fixture[0].x);
  await page.getByTestId("page").focus(); await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(async () => (await saved(page))[0]).toMatchObject({ x: fixture[0].x, y: fixture[0].y, w: 250 });
  await page.keyboard.press("ControlOrMeta+z"); await expect.poll(() => saved(page)).toEqual(fixture);
});

test("Layers selection, tab navigation, stacking and rotated page alignment work together", async ({ page }, info) => {
  const controls = await open(page), arrange = controls.getByRole("tab", { name: "Arrange" }), layers = controls.getByRole("tab", { name: "Layers" });
  await arrange.press("End"); await expect(layers).toBeFocused(); await expect(layers).toHaveAttribute("aria-selected", "true");
  const ellipse = controls.getByRole("button", { name: "ellipse", exact: true }); await ellipse.click();
  const before = await saved(page); await ellipse.press("ArrowDown"); expect(await saved(page)).toEqual(before);
  await layers.press("Home"); await expect(arrange).toBeFocused(); await expect(controls.getByRole("spinbutton", { name: "Width", exact: true })).toHaveValue("80");
  await controls.getByRole("button", { name: "Forward", exact: true }).click();
  await expect.poll(async () => (await saved(page)).map(e => e.id)).toEqual(["a", "c", "b"]); await expect(controls.getByRole("button", { name: "To front", exact: true })).toBeDisabled();
  await field(page, "Rotate", "90"); await controls.getByRole("button", { name: "Right", exact: true }).click();
  // A 90-degree 80x160 ellipse has a 160x80 visible bounding box.
  await expect.poll(async () => (await saved(page)).find(e => e.id === "b")!.x).toBe(680);
  await layers.click(); await expect(ellipse).toHaveAttribute("aria-pressed", "true"); await page.screenshot({ path: info.outputPath("position-layers.png") });
});

test("multiple elements space evenly, scale proportionally and rotate in one undo step", async ({ page }) => {
  await page.getByTestId("page").focus(); await page.keyboard.press("ControlOrMeta+a"); const controls = await open(page);
  await expect(controls.getByRole("button", { name: "Lock aspect ratio" })).toBeDisabled();
  await controls.getByRole("button", { name: "Horizontally", exact: true }).click(); expect((await saved(page))[1].x).toBe(410);
  const spaced = await saved(page); await field(page, "Width", "300"); const scaled = await saved(page);
  expect(scaled.map(e => e.w)).toEqual([100, 40, 50]); expect(scaled[2].fontSize).toBe(10);
  await field(page, "Rotate by", "90"); await expect(controls.getByRole("spinbutton", { name: "Rotate by", exact: true })).toHaveValue("0");
  expect((await saved(page)).map(e => e.rotation)).toEqual([90, 90, 90]);
  await page.getByTestId("page").focus(); await page.keyboard.press("ControlOrMeta+z"); await expect.poll(() => saved(page)).toEqual(scaled);
  await page.keyboard.press("ControlOrMeta+z"); await expect.poll(() => saved(page)).toEqual(spaced);
});

test("locked elements are read-only, text height follows content, and Layers stays reachable without a selection", async ({ page }) => {
  await page.getByRole("button", { name: "Lock", exact: true }).click(); const controls = await open(page);
  for (const name of ["Width", "Height", "X", "Y", "Rotate"]) await expect(controls.getByRole("spinbutton", { name, exact: true })).toBeDisabled();
  await controls.getByRole("tab", { name: "Layers" }).click(); await controls.getByRole("button", { name: "Caption", exact: true }).click();
  await controls.getByRole("tab", { name: "Arrange" }).click(); await expect(controls.getByRole("spinbutton", { name: "Height", exact: true })).toBeDisabled();
  await controls.getByRole("button", { name: "Lock aspect ratio" }).click(); const height = controls.getByRole("spinbutton", { name: "Height", exact: true });
  const initial = Number(await height.inputValue()); await height.fill(String(initial * 2)); await height.press("Enter");
  expect((await saved(page)).find(e => e.id === "c")!.fontSize).toBe(40);
  await close(page); await page.getByTestId("page").focus(); await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "More canvas actions" }).click(); await page.getByRole("menuitem", { name: "Position", exact: true }).click();
  await expect(controls.getByText("Select an element to arrange it.")).toBeVisible(); await controls.getByRole("tab", { name: "Layers" }).click();
  await controls.getByRole("button", { name: "Caption", exact: true }).click(); await expect(page.getByTestId("selection")).toBeVisible();
});
