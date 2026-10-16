import { expect, test, waitForDesignSave } from "../../tests/e2e/fixtures";
import { blankDesign, makeEl } from "../../lib/design/ops";
import { captureContextMenu } from "./context-menu-evidence";

test("capture previous locked layer menu names and shortcuts", async ({ page }, info) => {
  await page.goto("/canvaisdead/login");
  const cookies = page.getByRole("button", { name: "Accept all cookies" }); if (await cookies.isVisible()) await cookies.click();
  await page.getByRole("button", { name: "Use the demo account" }).click();
  await expect(page.getByTestId("designs")).toBeVisible();
  await page.locator(".cx-qc").getByRole("button", { name: "Presentation", exact: true }).click();
  await expect(page.getByTestId("page")).toBeVisible();
  const d = blankDesign({ w: 800, h: 600 }), id = page.url().split("/").at(-1)!;
  const elements = [
    makeEl("rect", d, { id: "a", x: 100, y: 100, w: 200, h: 120, fill: "#ff5757" }),
    makeEl("ellipse", d, { id: "b", x: 150, y: 140, w: 120, h: 80, fill: "#00c4cc" }),
    makeEl("text", d, { id: "c", x: 500, y: 400, w: 200, text: "Caption", fontSize: 24 }),
    makeEl("triangle", d, { id: "d", x: 600, y: 100, w: 120, h: 80, locked: true }),
  ];
  await page.evaluate(async ({ id, elements }) => {
    const key = (await window.designTestStorage.keys()).find(key => key.endsWith(":designs"))!, designs = JSON.parse(await window.designTestStorage.getItem(key));
    await window.designTestStorage.setItem(key, JSON.stringify(designs.map((design: { id: string }) => design.id === id ? { ...design, w: 800, h: 600, els: elements } : design)));
  }, { id, elements });
  await waitForDesignSave(page); await page.reload(); await expect(page.getByTestId("page")).toBeVisible();
  await page.getByRole("button", { name: "Position", exact: true }).click();
  await page.getByRole("tab", { name: "Layers", exact: true }).click();
  const list = page.getByRole("list", { name: "Design layers" });
  await list.getByRole("button", { name: "Rectangle", exact: true }).click();
  await page.getByRole("button", { name: "Overlapping", exact: true }).click();
  await page.getByRole("button", { name: "All", exact: true }).click();
  const more = list.getByRole("button", { name: "Layer actions for Triangle" });
  await more.focus(); await more.press("Enter");
  await captureContextMenu(page, info.project.name, "before");
});
