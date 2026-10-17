import { waitForDesignSave } from "./fixtures";
import { expect, test } from "./fixtures";
import { captureLibraryLayout, emptyProjects, measureLibraryLayout, openProjects } from "../../scripts/parity/library-layout-evidence";

test.beforeEach(async ({ page }) => {
  await openProjects(page);
});

function expectContentFits(metrics: Awaited<ReturnType<typeof measureLibraryLayout>>) {
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewport.width);
  expect(metrics.scrollport.scrollWidth, "Projects must not require horizontal scrolling").toBeLessThanOrEqual(metrics.scrollport.clientWidth);
  for (const item of metrics.content) {
    expect(item.x, `${item.label}: left edge`).toBeGreaterThanOrEqual(metrics.scrollport.x);
    expect(item.x + item.w, `${item.label}: right edge`).toBeLessThanOrEqual(Math.min(metrics.viewport.width, metrics.scrollport.x + metrics.scrollport.clientWidth));
  }
}

test("project view links stay reachable beside the free-access status", async ({ page }, info) => {
  const checkLayout = async (view: "projects" | "trash" | "projects-empty") => {
    const metrics = await captureLibraryLayout(page, info.project.name, "after", view), badge = metrics.badge;
    expectContentFits(metrics);
    expect(metrics.links.map(link => link.label?.trim()).sort()).toEqual(["All projects", "Starred", "Trash"]);
    for (const link of metrics.links) {
      expect(link.receivesPointer, `${view}: ${link.label} center hits ${link.hitClass ?? link.hitTag}`).toBe(true);
      const overlaps = link.x < badge.x + badge.w && link.x + link.w > badge.x && link.y < badge.y + badge.h && link.y + link.h > badge.y;
      expect(overlaps, `${view}: ${link.label} must not overlap the status badge`).toBe(false);
    }
  };
  await checkLayout("projects");
  await expect(page.getByRole("link", { name: "All projects", exact: true })).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "Trash", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your Trash is empty", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Trash", exact: true })).toHaveAttribute("aria-current", "page");
  await checkLayout("trash");
  await page.getByRole("link", { name: "All projects", exact: true }).focus(); await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/app\/projects$/);
  await expect(page.getByTestId("designs").locator(".cd-card").first()).toBeVisible();
  await emptyProjects(page);
  await checkLayout("projects-empty");
  const create = page.getByRole("button", { name: "Create design", exact: true });
  await create.click(); await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape"); await expect(create).toBeFocused();
});

test("project content fits after resizing through narrow and sidebar layouts", async ({ page }) => {
  for (const width of [320, 820, 821, 1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expectContentFits(await measureLibraryLayout(page));
    await page.getByRole("link", { name: "Trash", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Your Trash is empty", exact: true })).toBeVisible();
    expectContentFits(await measureLibraryLayout(page));
    await page.getByRole("link", { name: "All projects", exact: true }).click();
    await expect(page.getByTestId("designs").locator(".cd-card").first()).toBeVisible();
  }
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
  await waitForDesignSave(page); await page.reload();
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
  await waitForDesignSave(page); await page.reload();
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
  await expect(page.locator(".cd-rename").getByRole("alert")).toContainText("Enter a name");
  await input.press("Escape"); await expect(input).toHaveCount(0);
  await page.getByRole("textbox", { name: "Search projects", exact: true }).fill("unmatched-library-query");
  await expect(page.getByRole("heading", { name: "No designs match your search." })).toBeVisible();
  await expect(page.getByTestId("designs").locator(".cd-card")).toHaveCount(0);
});

test("expired Trash is removed on reopening the library while active designs remain", async ({ page }) => {
  const before = await page.getByTestId("designs").locator(".cd-card").count();
  await page.evaluate(async () => {
    const key = (await window.designTestStorage.keys()).find(key => key.endsWith(":designs"))!;
    const library = JSON.parse((await window.designTestStorage.getItem(key)));
    library[0].trashedAt = Date.now() - 31 * 24 * 60 * 60 * 1000;
    await window.designTestStorage.setItem(key, JSON.stringify(library));
  });
  await waitForDesignSave(page); await page.reload();
  await expect(page.getByTestId("designs").locator(".cd-card")).toHaveCount(before - 1);
  await expect.poll(() => page.evaluate(async () => {
    const key = (await window.designTestStorage.keys()).find(key => key.endsWith(":designs"))!;
    return JSON.parse((await window.designTestStorage.getItem(key))).length;
  })).toBe(before - 1);
  await page.getByRole("link", { name: "Trash", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your Trash is empty" })).toBeVisible();
});
