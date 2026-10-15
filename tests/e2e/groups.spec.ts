import { expect, test, type Page } from "@playwright/test";
import type { El } from "@/lib/design/types";
import { blankDesign, makeEl } from "@/lib/design/ops";

const doc = blankDesign({ w: 800, h: 600 });
const fixture = [
  makeEl("rect", doc, { id: "a", x: 80, y: 100, w: 100, h: 80, fill: "#ff5757" }),
  makeEl("ellipse", doc, { id: "b", x: 300, y: 200, w: 120, h: 100, fill: "#00c4cc" }),
  makeEl("text", doc, { id: "c", x: 100, y: 400, w: 300, text: "Keep this grouped", fontSize: 30 }),
];
async function saved(page: Page): Promise<El[]> {
  const id = page.url().split("/").at(-1)!;
  return page.evaluate(id => {
    const key = Object.keys(localStorage).find(key => key.endsWith(":designs"))!;
    const design = JSON.parse(localStorage.getItem(key)!).find((d: { id: string }) => d.id === id);
    return design.pages ? design.pages[0].els : design.els;
  }, id);
}
async function groupPair(page: Page) {
  const canvas = page.getByTestId("page");
  await page.getByRole("button", { name: "Select multiple", exact: true }).click();
  await canvas.locator('rect[fill="#ff5757"]').click();
  await canvas.locator('ellipse[fill="#00c4cc"]').click();
  await page.getByRole("button", { name: "Group", exact: true }).click();
  await expect(page.getByTestId("multi-selection")).toHaveAttribute("data-group-id", /^g_/);
}
async function clearSelection(page: Page) {
  await page.getByTestId("page").focus(); await page.keyboard.press("Escape");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/canvaisdead/login"); await page.getByRole("button", { name: "Use the demo account" }).click();
  await expect(page.getByTestId("designs")).toBeVisible();
  await page.locator(".cx-qc").getByRole("button", { name: "Presentation", exact: true }).click();
  await expect(page.getByTestId("page")).toBeVisible();
  const id = page.url().split("/").at(-1)!;
  await page.evaluate(({ id, fixture }) => {
    const key = Object.keys(localStorage).find(key => key.endsWith(":designs"))!;
    const designs = JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(key, JSON.stringify(designs.map((d: { id: string }) => d.id === id ? { ...d, w: 800, h: 600, els: fixture } : d)));
  }, { id, fixture });
  await page.reload(); await expect(page.getByTestId("page")).toBeVisible();
  if (await page.getByRole("button", { name: "Hide side panel", exact: true }).isVisible()) await page.getByRole("button", { name: "Hide side panel", exact: true }).click();
});

test("groups survive reload, select as one unit, duplicate independently and ungroup with undo", async ({ page }, testInfo) => {
  await groupPair(page);
  const original = (await saved(page))[0].groupPath!;
  await page.screenshot({ path: testInfo.outputPath("group-created.png") });
  await page.reload(); await expect(page.getByTestId("page")).toBeVisible();
  await page.getByTestId("page").locator('rect[fill="#ff5757"]').click();
  await expect(page.getByTestId("multi-selection")).toHaveAttribute("data-count", "2");
  await page.keyboard.press("Shift+ArrowRight");
  await expect.poll(async () => (await saved(page)).slice(0, 2).map(e => e.x)).toEqual([90, 310]);
  await page.keyboard.press("ControlOrMeta+d");
  await expect.poll(async () => (await saved(page)).length).toBe(5);
  const copied = await saved(page);
  expect(copied[3].groupPath).toEqual(copied[4].groupPath); expect(copied[3].groupPath).not.toEqual(original);
  await page.getByRole("button", { name: "Ungroup", exact: true }).click();
  await expect.poll(async () => (await saved(page)).slice(3).every(e => !e.groupPath)).toBe(true);
  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(() => saved(page)).toEqual(copied);
});

test("nested groups allow member edits, parent selection and removal without losing the rest", async ({ page }, testInfo) => {
  await groupPair(page);
  const canvas = page.getByTestId("page");
  await canvas.locator("text").click({ modifiers: ["Shift"] });
  await page.keyboard.press("ControlOrMeta+g");
  await expect.poll(async () => (await saved(page))[0].groupPath?.length).toBe(2);
  await clearSelection(page);
  await canvas.locator('ellipse[fill="#00c4cc"]').click();
  await expect(page.getByTestId("multi-selection")).toHaveAttribute("data-count", "3");
  await canvas.locator('ellipse[fill="#00c4cc"]').click();
  await expect(page.getByTestId("multi-selection")).toHaveAttribute("data-count", "2");
  await canvas.locator('ellipse[fill="#00c4cc"]').click();
  await expect(page.getByTestId("multi-selection")).toHaveCount(0);
  await page.keyboard.press("ArrowRight");
  await expect.poll(async () => (await saved(page)).find(e => e.id === "b")!.x).toBe(301);
  await page.getByRole("button", { name: "Ungroup", exact: true }).click();
  await expect.poll(async () => (await saved(page)).slice(0, 2).map(e => e.groupPath?.length)).toEqual([1, 1]);
  await page.getByRole("button", { name: "Select parent group", exact: true }).click();
  await expect(page.getByTestId("multi-selection")).toHaveAttribute("data-count", "3");
  await canvas.locator("text").dblclick();
  const text = page.getByRole("textbox", { name: "Edit text", exact: true });
  await text.fill("Edited inside a group"); await text.press("Escape");
  await expect.poll(async () => (await saved(page)).find(e => e.id === "c")!.text).toBe("Edited inside a group");
  expect((await saved(page)).find(e => e.id === "c")!.groupPath).toHaveLength(1);
  await page.screenshot({ path: testInfo.outputPath("group-member-edit.png") });
  await page.getByRole("button", { name: "Select parent group", exact: true }).click();
  await page.keyboard.press("ControlOrMeta+Shift+g");
  await expect.poll(async () => (await saved(page)).every(e => !e.groupPath)).toBe(true);
});

test("a group containing a locked member cannot be partially moved or deleted", async ({ page }) => {
  await groupPair(page); await clearSelection(page);
  const canvas = page.getByTestId("page"), rect = canvas.locator('rect[fill="#ff5757"]');
  await rect.click(); await rect.click();
  await page.getByRole("button", { name: "Lock", exact: true }).click();
  await page.getByRole("button", { name: "Select parent group", exact: true }).click();
  const before = await saved(page);
  await expect(page.getByRole("button", { name: "Delete selection", exact: true })).toBeDisabled();
  await canvas.focus(); await page.keyboard.press("ArrowRight"); await page.keyboard.press("Delete");
  expect(await saved(page)).toEqual(before);
  await page.getByRole("button", { name: "Lock selection", exact: true }).click();
  await page.getByRole("button", { name: "Unlock selection", exact: true }).click();
  await page.getByRole("button", { name: "Delete selection", exact: true }).click();
  await expect.poll(async () => (await saved(page)).map(e => e.id)).toEqual(["c"]);
});
