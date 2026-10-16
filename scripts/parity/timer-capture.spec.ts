import { test } from "../../tests/e2e/fixtures";
import { captureTimer, createPresentationDeck } from "./timer-evidence";
test("preceding editor and presentation timer controls", async ({ page }, info) => {
  await createPresentationDeck(page); await captureTimer(page, info.project.name, "before", "editor");
  await page.getByRole("button", { name: "Present", exact: true }).click(); await captureTimer(page, info.project.name, "before", "presentation");
});
