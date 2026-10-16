import { expect, test, waitForDesignSave } from "../../tests/e2e/fixtures";
import { captureLayersHistory, layerHistoryFixture, startRectangleLayerDrag } from "./layers-history-evidence";

test("capture previous Position panel state after layer Undo and Redo", async ({ page }, info) => {
  await page.goto("/canvaisdead/login");
  const cookies = page.getByRole("button", { name: "Accept all cookies" }); if (await cookies.isVisible()) await cookies.click();
  await page.getByRole("button", { name: "Use the demo account" }).click();
  await expect(page.getByTestId("designs")).toBeVisible();
  await page.locator(".cx-qc").getByRole("button", { name: "Presentation", exact: true }).click();
  await expect(page.getByTestId("page")).toBeVisible();
  const id = page.url().split("/").at(-1)!;
  await page.evaluate(async ({ id, elements }) => {
    const key = (await window.designTestStorage.keys()).find(key => key.endsWith(":designs"))!, designs = JSON.parse(await window.designTestStorage.getItem(key));
    await window.designTestStorage.setItem(key, JSON.stringify(designs.map((design: { id: string }) => design.id === id ? { ...design, w: 800, h: 600, els: elements } : design)));
  }, { id, elements: layerHistoryFixture() });
  await waitForDesignSave(page); await page.reload(); await expect(page.getByTestId("page")).toBeVisible();
  await page.getByRole("button", { name: "Position", exact: true }).click();
  await page.getByRole("tab", { name: "Layers", exact: true }).click();
  const order = () => page.evaluate(async id => {
    const key = (await window.designTestStorage.keys()).find(key => key.endsWith(":designs"))!;
    const design = JSON.parse(await window.designTestStorage.getItem(key)).find((d: { id: string }) => d.id === id);
    return (design.pages ? design.pages[0].els : design.els).map((element: { id: string }) => element.id) as string[];
  }, id);
  await startRectangleLayerDrag(page); expect(await order()).toEqual(["a", "b", "c", "d"]); await page.mouse.up();
  await expect.poll(order).toEqual(["b", "c", "a", "d"]);
  await page.getByTestId("page").focus(); await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(order).toEqual(["a", "b", "c", "d"]); await captureLayersHistory(page, info.project.name, "before", "undo", await order());
  await page.getByRole("button", { name: "Redo", exact: true }).click(); await expect.poll(order).toEqual(["b", "c", "a", "d"]);
  await captureLayersHistory(page, info.project.name, "before", "redo", await order());
});
