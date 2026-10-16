import { waitForDesignSave } from "./fixtures";
import { expect, test, type Page } from "./fixtures";
import type { El } from "@/lib/design/types";
import { captureContextMenu } from "../../scripts/parity/context-menu-evidence";
import { captureLayersHistory, layerHistoryFixture, startRectangleLayerDrag } from "../../scripts/parity/layers-history-evidence";

const fixture = layerHistoryFixture();
async function saved(page: Page): Promise<{ els: El[]; bg: string }> {
  const id = page.url().split("/").at(-1)!;
  return page.evaluate(async id => { const key = (await window.designTestStorage.keys()).find(key => key.endsWith(":designs"))!, design = JSON.parse((await window.designTestStorage.getItem(key))).find((value: { id: string }) => value.id === id); return design.pages ? design.pages[0] : design; }, id);
}
async function seed(page: Page, elements = fixture) {
  const id = page.url().split("/").at(-1)!;
  await page.evaluate(async ({ id, elements }) => { const key = (await window.designTestStorage.keys()).find(key => key.endsWith(":designs"))!, designs = JSON.parse((await window.designTestStorage.getItem(key))); await window.designTestStorage.setItem(key, JSON.stringify(designs.map((design: { id: string }) => design.id === id ? { ...design, w: 800, h: 600, els: elements } : design))); }, { id, elements });
  await waitForDesignSave(page); await page.reload(); await expect(page.getByTestId("page")).toBeVisible();
}
async function open(page: Page) { await page.getByRole("button", { name: "Position", exact: true }).click(); await page.getByRole("tab", { name: "Layers", exact: true }).click(); return page.getByRole("region", { name: "Position", exact: true }); }
const rows = (page: Page) => page.getByRole("list", { name: "Design layers" });
const row = (page: Page, id: string) => rows(page).locator(`[data-layer-key="element:${id}"]`);
const order = async (page: Page) => (await saved(page)).els.map(e => e.id);
test.beforeEach(async ({ page }) => {
  await page.goto("/canvaisdead/login"); const cookies = page.getByRole("button", { name: "Accept all cookies" }); if (await cookies.isVisible()) await cookies.click();
  await page.getByRole("button", { name: "Use the demo account" }).click(); await expect(page.getByTestId("designs")).toBeVisible();
  await page.locator(".cx-qc").getByRole("button", { name: "Presentation", exact: true }).click(); await expect(page.getByTestId("page")).toBeVisible(); await seed(page); await open(page);
});

test("layer previews, overlapping filter, background editing and actions remain usable", async ({ page }, info) => {
  const list = rows(page); await list.getByRole("button", { name: "Rectangle", exact: true }).click();
  await expect(row(page, "a").locator(".cv-layer-preview svg")).toBeVisible();
  await page.getByRole("button", { name: "Overlapping", exact: true }).click();
  await expect(row(page, "a")).toBeVisible(); await expect(row(page, "b")).toBeVisible(); await expect(row(page, "c")).toHaveCount(0); await expect(row(page, "d")).toHaveCount(0);
  await page.getByRole("button", { name: "All", exact: true }).click(); await expect(row(page, "d")).toBeVisible();
  const more = list.getByRole("button", { name: "Layer actions for Triangle" }); await more.focus(); await more.press("Enter");
  const menu = page.getByRole("menu", { name: "Canvas actions" });
  await captureContextMenu(page, info.project.name, "after");
  for (const [label, shortcut] of [["Copy", "Ctrl/Cmd+C"], ["Cut", "Ctrl/Cmd+X"], ["Paste", "Ctrl/Cmd+V"], ["Duplicate", "Ctrl/Cmd+D"], ["Delete", "Delete"], ["Select all", "Ctrl/Cmd+A"]]) {
    const action = menu.getByRole("menuitem", { name: label, exact: true });
    await expect(action).toHaveAccessibleName(label); await expect(action).toHaveAccessibleDescription(shortcut);
  }
  await expect(menu.getByRole("menuitem", { name: "Delete", exact: true })).toBeDisabled();
  await expect(menu.getByRole("menuitem", { name: "Copy", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowDown"); await expect(menu.getByRole("menuitem", { name: "Paste", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowUp"); await expect(menu.getByRole("menuitem", { name: "Copy", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowUp"); await expect(menu.getByRole("menuitem", { name: "Select all", exact: true })).toBeFocused();
  await expect(menu.getByRole("menuitem", { name: "Unlock", exact: true })).toBeVisible(); await page.keyboard.press("Escape"); await expect(more).toBeFocused();
  await expect(page.getByRole("button", { name: "Position", exact: true })).toBeVisible();
  const caption = list.getByRole("button", { name: "Caption", exact: true }); await caption.press("Shift+F10");
  await menu.getByRole("menuitem", { name: "Duplicate", exact: true }).click(); await expect.poll(async () => (await saved(page)).els.length).toBe(5);
  expect((await saved(page)).els.at(-1)!.text).toBe("Caption");
  await list.getByRole("button", { name: "Background", exact: true }).click(); await expect(page.getByTestId("selection")).toHaveCount(0);
  await page.getByLabel("Page background color", { exact: true }).fill("#123abc"); await expect.poll(async () => (await saved(page)).bg.toLowerCase()).toBe("#123abc");
  await page.screenshot({ path: info.outputPath("layers-panel.png") }); await waitForDesignSave(page); await page.reload(); await expect(page.getByTestId("page")).toBeVisible(); expect((await saved(page)).bg.toLowerCase()).toBe("#123abc");
});

test("pointer dragging shows an insertion marker, commits once, and Escape cancels", async ({ page }, info) => {
  const position = page.getByRole("region", { name: "Position", exact: true }), layers = page.getByRole("tab", { name: "Layers", exact: true });
  await startRectangleLayerDrag(page); expect(await order(page)).toEqual(["a", "b", "c", "d"]); await page.mouse.up();
  await expect.poll(() => order(page)).toEqual(["b", "c", "a", "d"]);
  const reordered = await saved(page);
  await page.getByTestId("page").focus(); await page.keyboard.press("ControlOrMeta+z"); await expect.poll(() => order(page)).toEqual(["a", "b", "c", "d"]);
  const undone = await captureLayersHistory(page, info.project.name, "after", "undo", await order(page));
  expect(undone.positionVisible).toBe(true); expect(undone.templateSearchVisible).toBe(false); expect(undone.metrics.button.receivesPointer).toBe(true);
  await expect(position).toBeVisible(); await expect(layers).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: "Position", exact: true })).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("button", { name: "Redo", exact: true }).click(); await expect.poll(() => saved(page)).toEqual(reordered);
  await expect(position).toBeVisible(); await expect(layers).toHaveAttribute("aria-selected", "true");
  await captureLayersHistory(page, info.project.name, "after", "redo", await order(page));
  await page.getByRole("button", { name: "Undo", exact: true }).click(); await expect.poll(() => order(page)).toEqual(["a", "b", "c", "d"]);
  await expect(layers).toHaveAttribute("aria-selected", "true");
  await startRectangleLayerDrag(page);
  await page.keyboard.press("Escape"); await page.mouse.up(); await expect(position).toBeVisible(); expect(await order(page)).toEqual(["a", "b", "c", "d"]);
  await expect(rows(page).locator("[data-drop]")).toHaveCount(0);
  await page.getByTestId("page").focus(); await page.keyboard.press("ControlOrMeta+Shift+z"); await expect.poll(() => saved(page)).toEqual(reordered);
  await expect(layers).toHaveAttribute("aria-selected", "true");
  await waitForDesignSave(page); await page.reload(); await expect(page.getByTestId("page")).toBeVisible(); expect(await saved(page)).toEqual(reordered);
});

test("history preserves Arrange and does not reopen a collapsed Position panel", async ({ page }) => {
  await rows(page).getByRole("button", { name: "Rectangle", exact: true }).click();
  const arrange = page.getByRole("tab", { name: "Arrange", exact: true }), position = page.getByRole("region", { name: "Position", exact: true });
  await arrange.click();
  const x = position.getByRole("spinbutton", { name: "X", exact: true }); await x.fill("112"); await x.press("Enter");
  await expect.poll(async () => (await saved(page)).els.find(element => element.id === "a")!.x).toBe(112);
  await position.getByRole("heading", { name: "Position", exact: true }).focus(); await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(async () => (await saved(page)).els.find(element => element.id === "a")!.x).toBe(100);
  await expect(position).toBeVisible(); await expect(arrange).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect.poll(async () => (await saved(page)).els.find(element => element.id === "a")!.x).toBe(112); await expect(arrange).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Hide side panel", exact: true }).click(); await expect(position).toBeHidden();
  await page.getByTestId("page").focus(); await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(async () => (await saved(page)).els.find(element => element.id === "a")!.x).toBe(100);
  await expect(position).toBeHidden(); await expect(page.getByRole("button", { name: "Position", exact: true })).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Show side panel", exact: true }).click();
  await expect(position).toBeVisible(); await expect(arrange).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("textbox", { name: "Search templates", exact: true })).toBeHidden();
});

test("keyboard moving preserves multi-layer order and protects mixed locks", async ({ page }) => {
  const list = rows(page); await list.getByRole("button", { name: "Rectangle", exact: true }).click(); await list.getByRole("button", { name: "Caption", exact: true }).click({ modifiers: ["Shift"] });
  const handle = list.getByRole("button", { name: "Move Caption", exact: true }); await handle.press("Space"); await page.keyboard.press("End");
  expect(await order(page)).toEqual(["a", "b", "c", "d"]); await page.keyboard.press("Enter"); await expect.poll(() => order(page)).toEqual(["a", "c", "b", "d"]);
  const after = (await saved(page)).els; for (const e of after) expect(e).toEqual(fixture.find(original => original.id === e.id));
  await handle.press("Space"); await page.keyboard.press("Home"); await page.keyboard.press("Escape"); expect(await order(page)).toEqual(["a", "c", "b", "d"]);
  await list.getByRole("button", { name: "Rectangle", exact: true }).click(); await list.getByRole("button", { name: "Triangle · locked", exact: true }).click({ modifiers: ["Shift"] });
  await expect(list.getByRole("button", { name: "Move Rectangle", exact: true })).toBeDisabled(); await expect(list.getByRole("button", { name: "Move Triangle", exact: true })).toBeDisabled();
});

test("nested member reordering keeps membership and cannot drop across a parent boundary", async ({ page }) => {
  const grouped = fixture.map(e => ({ ...e, ...(e.id === "a" || e.id === "b" ? { groupPath: ["outer", "inner"] } : e.id === "c" ? { groupPath: ["outer"] } : {}) }));
  await seed(page, grouped); await open(page);
  await rows(page).getByText("Group contents", { exact: true }).first().click(); await rows(page).getByText("Group contents", { exact: true }).nth(1).click();
  const handle = rows(page).getByRole("button", { name: "Move Rectangle", exact: true }); await handle.press("Space"); await page.keyboard.press("Home"); await page.keyboard.press("Enter");
  await expect.poll(() => order(page)).toEqual(["b", "a", "c", "d"]); expect((await saved(page)).els.find(e => e.id === "a")!.groupPath).toEqual(["outer", "inner"]);
  await handle.scrollIntoViewIfNeeded(); const a = (await handle.boundingBox())!, c = (await row(page, "c").boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down(); await page.mouse.move(c.x + c.width / 2, c.y + 3, { steps: 8 }); await page.mouse.up();
  expect(await order(page)).toEqual(["b", "a", "c", "d"]); await expect(rows(page).locator("[data-drop]")).toHaveCount(0);
});
