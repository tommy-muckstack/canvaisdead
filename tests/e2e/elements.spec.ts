import { waitForDesignSave } from "./fixtures";
import { expect, test, type Page } from "./fixtures";
import type { El } from "@/lib/design/types";
import { captureDropEvidence, observeCanvasDrops } from "../../scripts/parity/drop-evidence";

const panel = (page: Page) => page.getByRole("region", { name: "Elements library", exact: true });
async function open(page: Page) { await page.getByRole("navigation", { name: "Tools" }).getByRole("button", { name: "Elements", exact: true }).click(); await expect(panel(page)).toBeVisible(); }
async function search(page: Page, value: string) { const input = panel(page).getByRole("searchbox", { name: "Search elements" }); await input.fill(value); await input.press("Enter"); }
async function elements(page: Page): Promise<El[]> {
  const id = page.url().split("/").at(-1)!;
  return page.evaluate(async id => { const key = (await window.designTestStorage.keys()).find(key => key.endsWith(":designs"))!, d = JSON.parse((await window.designTestStorage.getItem(key))).find((design: { id: string }) => design.id === id); return d.pages ? d.pages[0].els : d.els; }, id);
}
test.beforeEach(async ({ page }) => {
  await page.goto("/canvaisdead/login"); const cookies = page.getByRole("button", { name: "Accept all cookies" }); if (await cookies.isVisible()) await cookies.click();
  await page.getByRole("button", { name: "Use the demo account" }).click(); await expect(page.getByTestId("designs")).toBeVisible();
  await page.locator(".cx-qc").getByRole("button", { name: "Presentation", exact: true }).click(); await expect(page.getByTestId("page")).toBeVisible(); await open(page);
});

test("search submits keywords, retains category state and explains unavailable media", async ({ page }, info) => {
  const library = panel(page), input = library.getByRole("searchbox", { name: "Search elements" });
  await input.fill("yellow sunshine"); await expect(library.getByRole("heading", { name: "Browse categories" })).toBeVisible(); await input.press("Enter");
  await expect(library.getByRole("button", { name: "Add sun", exact: true })).toBeVisible(); await expect(library.getByRole("button", { name: "Add circle", exact: true })).toHaveCount(0);
  await library.getByRole("button", { name: "See all graphics", exact: true }).click(); await expect(library.getByRole("group", { name: "Element categories" }).getByRole("button", { name: "Graphics", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("navigation", { name: "Tools" }).getByRole("button", { name: "Text", exact: true }).click(); await open(page); await expect(input).toHaveValue("yellow sunshine");
  await search(page, "no matching artifact 774"); await expect(library.getByRole("heading", { name: "No elements found" })).toBeVisible();
  await input.press("Escape"); await expect(input).toHaveValue(""); await expect(input).toBeFocused();
  await library.getByRole("group", { name: "Element categories" }).getByRole("button", { name: "Photos", exact: true }).click();
  await expect(library.getByText("The stock photo library is not available yet.", { exact: false })).toBeVisible(); await library.getByRole("button", { name: "Open Uploads" }).click(); await expect(page.getByRole("button", { name: "Upload files", exact: true })).toBeVisible();
  await open(page); await library.getByRole("button", { name: "Browse available elements" }).click();
  await page.screenshot({ path: info.outputPath("elements-panel.png"), fullPage: true });
});

test("original graphics insert as independent groups with one-step undo and local reload", async ({ page }) => {
  await search(page, "purple flower"); await panel(page).getByRole("button", { name: "Add flower", exact: true }).press("Enter");
  await expect.poll(async () => (await elements(page)).length).toBe(7); const first = await elements(page), group = first[0].groupPath![0]; expect(first.every(e => e.groupPath?.[0] === group)).toBe(true);
  await open(page); await panel(page).getByRole("button", { name: "Add flower", exact: true }).click();
  await expect.poll(async () => (await elements(page)).length).toBe(14); const second = (await elements(page)).slice(7); expect(second.every(e => !first.some(old => old.id === e.id) && e.groupPath?.[0] !== group)).toBe(true);
  await page.getByTestId("page").focus(); await page.keyboard.press("ControlOrMeta+z"); await expect.poll(async () => (await elements(page)).length).toBe(7);
  await page.keyboard.press("ControlOrMeta+Shift+z"); await expect.poll(async () => (await elements(page)).length).toBe(14); await waitForDesignSave(page); await page.reload(); await expect.poll(async () => (await elements(page)).length).toBe(14);
  await open(page); await panel(page).getByRole("button", { name: "See all recently used", exact: true }).click(); await expect(panel(page).getByRole("button", { name: "Add flower", exact: true })).toHaveCount(1);
});

test("starred items and element menus persist without inserting artwork", async ({ page }) => {
  await search(page, "yellow sunshine"); const add = panel(page).getByRole("button", { name: "Add sun", exact: true }); await add.press("Shift+F10");
  const menu = page.getByRole("menu", { name: "Actions for Sun" }); await menu.getByRole("menuitem", { name: "Star", exact: true }).click(); await expect(add).toBeFocused(); expect(await elements(page)).toHaveLength(0);
  await waitForDesignSave(page); await page.reload(); await expect(page.getByTestId("page")).toBeVisible(); await open(page);
  await panel(page).getByRole("group", { name: "Element categories" }).getByRole("button", { name: "Starred", exact: true }).click(); await expect(add).toBeVisible();
  const more = panel(page).getByRole("button", { name: "More about Sun" }); await more.focus(); await more.press("Enter"); await page.keyboard.press("Escape"); await expect(more).toBeFocused();
  await more.press("Enter"); await menu.getByRole("menuitem", { name: "View collection" }).click(); await expect(panel(page).getByRole("button", { name: "Clear collection Colorful geometry" })).toBeVisible();
  await search(page, "sunshine"); await panel(page).getByRole("button", { name: "More about Sun" }).click(); await menu.getByRole("menuitem", { name: "Unstar", exact: true }).click();
  await panel(page).getByRole("button", { name: "Clear element search" }).click(); await panel(page).getByRole("button", { name: "Clear collection Colorful geometry" }).click();
  await panel(page).getByRole("group", { name: "Element categories" }).getByRole("button", { name: "Starred", exact: true }).click(); await expect(panel(page).getByRole("heading", { name: "No starred elements yet" })).toBeVisible();
});

test("filters compose with search and keyboard navigation does not move selected artwork", async ({ page }) => {
  await panel(page).getByRole("region", { name: "Shapes", exact: true }).getByRole("button", { name: "Add rectangle", exact: true }).click(); const before = await elements(page); await open(page);
  await panel(page).getByRole("button", { name: "Filters", exact: true }).click(); await panel(page).getByLabel("Color", { exact: true }).selectOption("White"); await panel(page).getByLabel("Orientation", { exact: true }).selectOption("Landscape");
  await search(page, "camera"); const camera = panel(page).getByRole("button", { name: "Add camera", exact: true }); await expect(camera).toBeVisible(); await camera.focus(); await camera.press("ArrowDown"); expect(await elements(page)).toEqual(before);
  await panel(page).getByLabel("Color", { exact: true }).selectOption("Green"); await expect(panel(page).getByRole("heading", { name: "No elements found" })).toBeVisible();
  await panel(page).getByRole("button", { name: "Clear filters", exact: true }).click(); await expect(camera).toBeVisible();
});

test("dragging a catalog item onto the canvas uses the actual drop coordinates", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "Native desktop drag does not verify physical-touch dragging.");
  await search(page, "cloud"); const canvas = page.getByTestId("page"), box = (await canvas.boundingBox())!;
  await observeCanvasDrops(page);
  await panel(page).getByRole("button", { name: "Add cloud", exact: true }).dragTo(canvas, { targetPosition: { x: box.width * .25, y: box.height * .3 } });
  await expect.poll(async () => (await elements(page)).length).toBe(4);
  const els = await elements(page), left = Math.min(...els.map(e => e.x)), right = Math.max(...els.map(e => e.x + e.w)), top = Math.min(...els.map(e => e.y)), bottom = Math.max(...els.map(e => e.y + e.h));
  await captureDropEvidence(page, info.project.name, "element-native", [{ clientX: box.x + box.width * .25, clientY: box.y + box.height * .3 }], [{ x: (left + right) / 2, y: (top + bottom) / 2 }]);
  expect((left + right) / 2).toBeCloseTo(1920 * .25, 0); expect((top + bottom) / 2).toBeCloseTo(1080 * .3, 0);
});
