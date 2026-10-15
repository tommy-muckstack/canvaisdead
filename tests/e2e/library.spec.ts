import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/canvaisdead/login");
  await page.getByRole("button", { name: "Use the demo account" }).click();
  await expect(page.getByTestId("designs")).toBeVisible();
  await page.goto("/canvaisdead/app/projects");
  await expect(page.getByTestId("designs").locator(".cd-card").first()).toBeVisible();
});

test("rename, copy, trash, restore and confirmed permanent deletion persist locally", async ({ page }, testInfo) => {
  const grid = page.getByTestId("designs");
  const before = await grid.locator(".cd-card").count();
  await grid.getByRole("button", { name: /^Rename / }).first().click();
  await page.getByRole("textbox", { name: "Design name", exact: true }).fill("Library workflow");
  await page.getByRole("textbox", { name: "Design name", exact: true }).press("Enter");
  await page.getByRole("button", { name: "More options for Library workflow", exact: true }).click();
  await page.getByRole("menuitem", { name: "Make a copy", exact: true }).click();
  await expect(grid.locator(".cd-card")).toHaveCount(before + 1);
  const copied = page.getByRole("link", { name: "Open Copy of Library workflow", exact: true });
  const href = (await copied.getAttribute("href"))!;
  await page.reload();
  await expect(copied).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("library-after-copy.png") });
  await page.getByRole("button", { name: "More options for Copy of Library workflow", exact: true }).click();
  await page.getByRole("menuitem", { name: "Move to Trash", exact: true }).click();
  await expect(copied).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(copied).toBeVisible();
  await page.getByRole("button", { name: "More options for Copy of Library workflow", exact: true }).click();
  await page.getByRole("menuitem", { name: "Move to Trash", exact: true }).click();
  await page.goto(href);
  await expect(page.getByRole("heading", { name: "This design is in Trash." })).toBeVisible();
  await page.getByRole("link", { name: "Trash", exact: true }).click();
  await page.getByRole("button", { name: "More options for Copy of Library workflow", exact: true }).click();
  await page.getByRole("menuitem", { name: "Restore", exact: true }).click();
  await expect(grid.locator(".cd-card")).toHaveCount(0);
  await page.getByRole("link", { name: "All projects", exact: true }).click();
  await expect(copied).toBeVisible();
  await page.getByRole("button", { name: "More options for Copy of Library workflow", exact: true }).click();
  await page.getByRole("menuitem", { name: "Move to Trash", exact: true }).click();
  await page.getByRole("link", { name: "Trash", exact: true }).click();
  await page.getByRole("button", { name: "More options for Copy of Library workflow", exact: true }).click();
  await page.getByRole("menuitem", { name: "Delete permanently", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(grid.locator(".cd-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Empty Trash", exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath("library-trash-confirmation.png") });
  await dialog.getByRole("button", { name: "Empty Trash", exact: true }).click();
  await page.reload();
  await expect(grid.locator(".cd-card")).toHaveCount(0);
  await page.getByRole("link", { name: "All projects", exact: true }).click();
  await expect(page.getByRole("link", { name: "Open Library workflow", exact: true })).toBeVisible();
  await expect(grid.locator(".cd-card")).toHaveCount(before);
});

test("card controls support keyboard dismissal, validation and project search", async ({ page }) => {
  const trigger = page.getByRole("button", { name: /^More options for / }).first();
  await trigger.focus(); await trigger.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Rename", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Make a copy", exact: true })).toBeFocused();
  await page.keyboard.press("Escape"); await expect(trigger).toBeFocused();
  await trigger.press("Enter"); await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
  const input = page.getByRole("textbox", { name: "Design name", exact: true });
  await input.fill("   "); await input.press("Enter");
  await expect(page.getByRole("alert")).toContainText("Enter a name");
  await input.press("Escape"); await expect(input).toHaveCount(0);
  await page.getByRole("textbox", { name: "Search projects", exact: true }).fill("unmatched-library-query");
  await expect(page.getByRole("heading", { name: "No designs match your search." })).toBeVisible();
  await expect(page.getByTestId("designs").locator(".cd-card")).toHaveCount(0);
});

test("expired Trash is removed on reopening the library while active designs remain", async ({ page }) => {
  const before = await page.getByTestId("designs").locator(".cd-card").count();
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find(key => key.endsWith(":designs"))!;
    const library = JSON.parse(localStorage.getItem(key)!);
    library[0].trashedAt = Date.now() - 31 * 24 * 60 * 60 * 1000;
    localStorage.setItem(key, JSON.stringify(library));
  });
  await page.reload();
  await expect(page.getByTestId("designs").locator(".cd-card")).toHaveCount(before - 1);
  await expect.poll(() => page.evaluate(() => {
    const key = Object.keys(localStorage).find(key => key.endsWith(":designs"))!;
    return JSON.parse(localStorage.getItem(key)!).length;
  })).toBe(before - 1);
  await page.getByRole("link", { name: "Trash", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your Trash is empty" })).toBeVisible();
});
