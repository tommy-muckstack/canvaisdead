import { expect, test } from "../../tests/e2e/fixtures";
import { captureStars, FAVORITE, setupStars } from "./stars-evidence";
test("capture preceding project cards, card actions and inert editor Projects", async ({ page }, info) => {
  await setupStars(page); await captureStars(page, info.project.name, "before", "projects");
  await page.getByRole("button", { name: `More options for ${FAVORITE}`, exact: true }).click(); await captureStars(page, info.project.name, "before", "menu"); await page.keyboard.press("Escape");
  await page.getByRole("link", { name: `Open ${FAVORITE}`, exact: true }).click(); await expect(page.getByTestId("page")).toBeVisible();
  await page.getByRole("button", { name: "Projects", exact: true }).click(); await captureStars(page, info.project.name, "before", "editor");
});
