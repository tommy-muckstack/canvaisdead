import { expect, test } from "../../tests/e2e/fixtures";
import { captureToolbar } from "./toolbar-evidence";

test("capture the previous floating toolbar over synthetic text", async ({ page }, info) => {
  await page.goto("/canvaisdead/login");
  const cookies = page.getByRole("button", { name: "Accept all cookies" }); if (await cookies.isVisible()) await cookies.click();
  await page.getByRole("button", { name: "Use the demo account" }).click();
  await expect(page.getByTestId("designs")).toBeVisible();
  await page.locator(".cx-qc").getByRole("button", { name: "Presentation", exact: true }).click();
  await expect(page.getByTestId("page")).toBeVisible();
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: "Add a heading", exact: true }).click();
  await expect(page.getByTestId("float-toolbar")).toBeVisible();
  await captureToolbar(page, info.project.name, "before");
});
