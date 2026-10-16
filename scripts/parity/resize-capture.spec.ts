import { test } from "../../tests/e2e/fixtures";
import { setupResize, captureResize } from "./resize-evidence";
test("capture preceding resize controls", async ({ page }, info) => {
  await setupResize(page); await captureResize(page, info.project.name, "before", "closed");
  await page.getByRole("button", { name: "Resize", exact: true }).click();
  await captureResize(page, info.project.name, "before", "opened");
});
