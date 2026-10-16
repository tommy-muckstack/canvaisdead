import { expect, test, type Page } from "./fixtures";
import { capturePageControls, pageControlMetrics } from "../../scripts/parity/page-controls-evidence";

async function reachableControls(page: Page, canvasClear = false) {
  await expect.poll(async () => {
    const { row, toolbar, canvas, controls } = await pageControlMetrics(page);
    return row.y >= toolbar.y + toolbar.h + 11 && controls.filter(control => !control.disabled).every(control => control.reachable)
      && (!canvasClear || canvas.y >= row.y + row.h);
  }).toBe(true);
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

test("page controls remain reachable with text, multiple selection and grid view", async ({ page }, info) => {
  await reachableControls(page, true);
  await capturePageControls(page, info.project.name, "after");
  await page.getByRole("button", { name: "Select multiple", exact: true }).click();
  await reachableControls(page, true);
  await page.getByRole("button", { name: "Done selecting", exact: true }).click();
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: "Add a heading", exact: true }).click();
  await page.getByTestId("page").focus(); await page.keyboard.press("ControlOrMeta+a");
  await expect(page.getByTestId("multi-selection")).toHaveAttribute("data-count", "2");
  await reachableControls(page, true);
  await page.getByRole("button", { name: "Select multiple", exact: true }).click();
  await reachableControls(page, true);
  await page.getByRole("button", { name: "Done selecting", exact: true }).click();
  await page.getByRole("button", { name: "More canvas actions", exact: true }).click();
  await expect(page.getByRole("menu", { name: "Canvas actions" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Grid view", exact: true }).click();
  await reachableControls(page);
  await expect.poll(async () => {
    const grid = (await page.getByRole("tablist", { name: "Page grid" }).boundingBox())!, { row } = await pageControlMetrics(page);
    return grid.y >= row.y + row.h;
  }).toBe(true);
  await page.getByRole("button", { name: "Edit page", exact: true }).click();
  await expect(page.getByTestId("page")).toBeVisible();
  await reachableControls(page, true);
});

test("page controls follow viewport reflow and remain clickable after zoom and workspace scroll", async ({ page }) => {
  const original = page.viewportSize()!;
  await page.setViewportSize({ width: original.width === 390 ? 1440 : 390, height: original.height });
  await reachableControls(page, true);
  await page.setViewportSize(original);
  await reachableControls(page, true);
  const zoom = page.getByRole("slider", { name: "Zoom", exact: true });
  await zoom.focus(); await zoom.press("End");
  await expect(zoom).toHaveValue("3");
  await page.locator(".cv-stage").evaluate(area => { area.scrollTop = area.scrollHeight; });
  await reachableControls(page);
  await page.getByRole("button", { name: "Add page", exact: true }).click();
  await expect(page.getByLabel("Page count", { exact: true })).toHaveText("2 / 2");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Page count", { exact: true })).toHaveText("1 / 1");
  await expect(page.getByTestId("page").locator("text")).toHaveText("Add a heading");
});
