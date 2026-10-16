import { test } from "../../tests/e2e/fixtures";
import { captureFileMenu, setupFileMenu } from "./file-menu-evidence";

test("capture the preceding File menu", async ({ page }, info) => {
  await setupFileMenu(page);
  await captureFileMenu(page, info.project.name, "before", "closed");
  await page.getByRole("button", { name: "File", exact: true }).click();
  await captureFileMenu(page, info.project.name, "before", "activated");
});
