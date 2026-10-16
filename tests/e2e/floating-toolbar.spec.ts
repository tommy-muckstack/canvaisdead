import { expect, test, waitForDesignSave, type Page } from "./fixtures";
import { captureToolbar } from "../../scripts/parity/toolbar-evidence";

async function clearOfArtwork(page: Page, group = false) {
  const toolbar = page.getByTestId(group ? "group-toolbar" : "float-toolbar");
  await expect(toolbar).toBeVisible();
  await expect.poll(async () => {
    const outlines = page.getByTestId(group ? "multi-selection" : "selection").locator("rect");
    const b = (await toolbar.boundingBox())!, s = (await (group ? outlines.last() : outlines.first()).boundingBox())!;
    return b.x + b.width <= s.x || s.x + s.width <= b.x || b.y + b.height <= s.y || s.y + s.height <= b.y;
  }).toBe(true);
  const b = (await toolbar.boundingBox())!, viewport = page.viewportSize()!;
  expect(b.x).toBeGreaterThanOrEqual(0); expect(b.x + b.width).toBeLessThanOrEqual(viewport.width);
  expect(b.y).toBeGreaterThanOrEqual(0); expect(b.y + b.height).toBeLessThanOrEqual(viewport.height);
  return toolbar;
}
test.beforeEach(async ({ page }) => {
  await page.goto("/canvaisdead/login");
  const cookies = page.getByRole("button", { name: "Accept all cookies" }); if (await cookies.isVisible()) await cookies.click();
  await page.getByRole("button", { name: "Use the demo account" }).click();
  await expect(page.getByTestId("designs")).toBeVisible();
  await page.locator(".cx-qc").getByRole("button", { name: "Presentation", exact: true }).click();
  await expect(page.getByTestId("page")).toBeVisible();
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: "Add a heading", exact: true }).click();
});

test("floating toolbar leaves text editable and keyboard actions reachable at both widths", async ({ page }, info) => {
  const toolbar = await clearOfArtwork(page);
  await captureToolbar(page, info.project.name, "after");
  await page.getByTestId("page").locator("text").dblclick();
  const editor = page.getByRole("textbox", { name: "Edit text", exact: true });
  await expect(editor).toBeFocused(); await editor.fill("An unobstructed heading"); await editor.press("Escape");
  await expect(page.getByTestId("page").locator("text")).toHaveText("An unobstructed heading");
  await clearOfArtwork(page);
  await toolbar.getByRole("button", { name: "Lock", exact: true }).focus(); await page.keyboard.press("Enter");
  await expect(toolbar.getByRole("button", { name: "Unlock", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Enter"); await expect(toolbar.getByRole("button", { name: "Lock", exact: true })).toBeVisible();
  await toolbar.getByRole("button", { name: "More", exact: true }).click();
  await expect(page.getByRole("menu", { name: "Canvas actions" })).toBeVisible();
  await page.keyboard.press("Escape"); await expect(page.getByRole("menu", { name: "Canvas actions" })).toHaveCount(0);
  await waitForDesignSave(page); await page.reload();
  await expect(page.getByTestId("page").locator("text")).toHaveText("An unobstructed heading");
});

test("floating toolbar follows rotated edge selections, zoom and grouped artwork", async ({ page }) => {
  const id = page.url().split("/").at(-1)!;
  await waitForDesignSave(page);
  await page.evaluate(async id => {
    const key = (await window.designTestStorage.keys()).find(key => key.endsWith(":designs"))!;
    const designs = JSON.parse(await window.designTestStorage.getItem(key));
    const d = designs.find((item: { id: string }) => item.id === id), els = d.pages ? d.pages[0].els : d.els;
    Object.assign(els[0], { x: 20, y: 20, w: 320, fontSize: 60, rotation: 28, text: "Edge" });
    await window.designTestStorage.setItem(key, JSON.stringify(designs));
  }, id);
  await page.reload(); await page.getByTestId("page").locator("text").click();
  await clearOfArtwork(page);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click(); await clearOfArtwork(page);
  await page.getByRole("button", { name: "Zoom out", exact: true }).click(); await clearOfArtwork(page);
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: "Add a heading", exact: true }).click();
  await page.getByTestId("page").focus(); await page.keyboard.press("ControlOrMeta+a");
  const group = await clearOfArtwork(page, true); await group.getByRole("button", { name: "Group", exact: true }).click();
  await clearOfArtwork(page, true); await group.getByRole("button", { name: "Ungroup", exact: true }).focus(); await page.keyboard.press("Enter");
  await expect(group.getByRole("button", { name: "Group", exact: true })).toBeVisible();
});
