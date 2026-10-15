import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/canvaisdead/login");
  await page.getByRole("button", { name: "Use the demo account" }).click();
  await expect(page.getByTestId("designs")).toBeVisible();
});

test("Create opens a searchable picker from Projects and returns keyboard focus on dismissal", async ({ page }, testInfo) => {
  await page.goto("/canvaisdead/app/projects");
  const trigger = page.getByRole("button", { name: "Create a design", exact: true });
  await trigger.focus(); await trigger.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Create a design" });
  const search = dialog.getByRole("searchbox", { name: "Search design types and sizes" });
  await expect(search).toBeFocused();
  await search.fill("nothing-matches");
  await expect(dialog.getByRole("status")).toContainText("No design types match");
  await search.fill("presentation");
  await expect(dialog.locator(".cx-create-presets button")).toHaveCount(1);
  const bounds = (await dialog.boundingBox())!, viewport = page.viewportSize()!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
  await page.screenshot({ path: testInfo.outputPath("create-preset-search.png") });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("searchbox").fill("presentation");
  await dialog.getByRole("button", { name: "Presentation 1920 × 1080 px", exact: true }).click();
  await expect(page.getByTestId("page")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Design name" })).toHaveValue("Untitled design - Presentation");
});

test("Custom size validates, converts units, locks proportions and persists the requested canvas", async ({ page }, testInfo) => {
  await page.locator(".cx-qc").getByRole("button", { name: "Custom size", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Create a design" });
  await expect(dialog.getByRole("textbox", { name: "Width", exact: true })).toBeFocused();
  await dialog.getByRole("button", { name: "Create new design", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Enter a positive");
  await dialog.getByLabel("Width", { exact: true }).fill("8000");
  await dialog.getByLabel("Height", { exact: true }).fill("8000");
  await dialog.getByRole("button", { name: "Create new design", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("25 million pixels");
  await dialog.getByLabel("Width", { exact: true }).fill("816");
  await dialog.getByLabel("Height", { exact: true }).fill("1056");
  await dialog.getByLabel("Units", { exact: true }).selectOption("in");
  await expect(dialog.getByLabel("Width", { exact: true })).toHaveValue("8.5");
  await expect(dialog.getByLabel("Height", { exact: true })).toHaveValue("11");
  await dialog.getByRole("button", { name: "Lock aspect ratio", exact: true }).click();
  await dialog.getByLabel("Width", { exact: true }).fill("17");
  await expect(dialog.getByLabel("Height", { exact: true })).toHaveValue("22");
  await dialog.getByRole("button", { name: "Swap width and height", exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath("create-custom-size.png") });
  await dialog.getByRole("button", { name: "Create new design", exact: true }).click();
  await expect(page.getByTestId("page")).toBeVisible();
  await expect(page.getByTestId("page")).toHaveAttribute("viewBox", "0 0 2112 1632");
  const designId = page.url().split("/").at(-1)!;
  const savedSize = () => page.evaluate(id => {
    const key = Object.keys(localStorage).find(key => key.endsWith(":designs"))!;
    const design = JSON.parse(localStorage.getItem(key)!).find((item: { id: string }) => item.id === id);
    return { w: design.w, h: design.h };
  }, designId);
  expect(await savedSize()).toEqual({ w: 2112, h: 1632 });
  await page.reload(); await expect(page.getByTestId("page")).toBeVisible();
  await expect(page.getByTestId("page")).toHaveAttribute("viewBox", "0 0 2112 1632");
  expect(await savedSize()).toEqual({ w: 2112, h: 1632 });
  await page.goto("/canvaisdead/app");
  await page.locator(".cx-qc").getByRole("button", { name: "Custom size", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "2112 × 1632 px", exact: true })).toBeVisible();
});

test("creation waits for a successful local save and retries the same design", async ({ page }) => {
  const before = await page.getByTestId("designs").locator(".cd-card").count();
  await page.getByRole("button", { name: "Create a design", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Create a design" });
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key.endsWith(":designs")) throw new DOMException("Storage full", "QuotaExceededError");
      return original.call(this, key, value);
    };
    window.restoreDesignStorage = () => { Storage.prototype.setItem = original; };
  });
  await dialog.getByRole("button", { name: "Logo 500 × 500 px", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("could not be saved");
  await expect(page).toHaveURL(/\/app$/);
  await expect(dialog.getByRole("button", { name: "Logo 500 × 500 px", exact: true })).toBeDisabled();
  await page.evaluate(() => window.restoreDesignStorage?.());
  await dialog.getByRole("button", { name: "Retry saving", exact: true }).click();
  await expect(page.getByTestId("page")).toBeVisible();
  await page.goto("/canvaisdead/app/projects");
  await expect(page.getByTestId("designs").locator(".cd-card")).toHaveCount(before + 1);
});

test("unimplemented design types explain availability without creating unrelated artwork", async ({ page }) => {
  const before = await page.getByTestId("designs").locator(".cd-card").count();
  await page.locator(".cx-qc").getByRole("button", { name: "Website", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Create a design" });
  await expect(dialog).toContainText("Website design and publishing are not available yet.");
  await dialog.getByRole("button", { name: "Close Create a design" }).click();
  await expect(page.getByTestId("designs").locator(".cd-card")).toHaveCount(before);
});
