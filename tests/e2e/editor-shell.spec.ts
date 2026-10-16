import { expect, test } from "@playwright/test";

test("template search, collapsible panel and page dock remain usable at both widths", async ({ page }, testInfo) => {
  await page.goto("/canvaisdead/login");
  await page.getByRole("button", { name: "Use the demo account" }).click();
  await expect(page.getByTestId("designs")).toBeVisible();
  await page.locator(".cx-qc").getByRole("button", { name: "Presentation", exact: true }).click();
  // Creation saves asynchronously; the dashboard also has a Templates button.
  await expect(page.getByTestId("page")).toBeVisible();
  await page.getByRole("navigation", { name: "Tools", exact: true }).getByRole("button", { name: "Templates", exact: true }).click();
  await page.getByRole("textbox", { name: "Search templates", exact: true }).fill("sunset social");
  await expect(page.locator(".cv-tpl")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Template Sunset quote", exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Search templates", exact: true }).fill("no-such-template");
  await expect(page.getByRole("status", { name: "" }).filter({ hasText: "No templates match" })).toBeVisible();
  await page.getByRole("button", { name: "Clear template search", exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath("editor-template-panel.png") });
  await page.getByRole("button", { name: "Hide side panel", exact: true }).click();
  await expect(page.locator("#editor-panel")).toBeHidden();
  const canvas = await page.getByTestId("page").boundingBox();
  const viewport = page.viewportSize()!;
  expect(canvas).not.toBeNull(); expect(canvas!.x).toBeGreaterThanOrEqual(64);
  expect(canvas!.x + canvas!.width).toBeLessThanOrEqual(viewport.width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  await page.getByRole("button", { name: "Add a new page", exact: true }).click();
  await expect(page.getByLabel("Page count", { exact: true })).toHaveText("2 / 2");
  await page.screenshot({ path: testInfo.outputPath("editor-collapsed-panel.png") });
  await page.getByRole("button", { name: "Show side panel", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Search templates", exact: true })).toBeVisible();
});
