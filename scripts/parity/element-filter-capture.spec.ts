import { expect, test } from "../../tests/e2e/fixtures";
import { captureElementFilters, elementLibrary, prepareElementFilters } from "./element-filter-evidence";

test("capture previous Elements filter labels and geometry", async ({ page }, info) => {
  await page.goto("/canvaisdead/login");
  await page.getByRole("button", { name: "Use the demo account" }).click();
  await expect(page.getByTestId("designs")).toBeVisible();
  await page.locator(".cx-qc").getByRole("button", { name: "Presentation", exact: true }).click();
  await expect(page.getByTestId("page")).toBeVisible(); await prepareElementFilters(page);
  await captureElementFilters(page, info.project.name, "before", "default");
  // Reach the old fields independently of the failing exact-label lookup.
  const filters = elementLibrary(page).locator(".cv-element-filters");
  await filters.locator("select").nth(0).selectOption("White");
  await filters.locator("select").nth(1).selectOption("Landscape");
  const search = elementLibrary(page).getByRole("searchbox", { name: "Search elements" });
  await search.fill("camera"); await search.press("Enter");
  await expect(elementLibrary(page).getByRole("button", { name: "Add camera", exact: true })).toBeVisible();
  await captureElementFilters(page, info.project.name, "before", "filtered");
});
