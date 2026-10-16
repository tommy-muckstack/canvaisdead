import { expect, test } from "../../tests/e2e/fixtures";
import { capturePresentation, createPresentationDeck } from "./presentation-evidence";

test("capture previous live controls and the presenter starting-page assumption", async ({ page, context }, info) => {
  const editor = await createPresentationDeck(page);
  await page.getByRole("button", { name: "Present", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Go to page" })).toHaveValue("2");
  await page.getByRole("main", { name: "Presentation", exact: true }).focus();
  await page.keyboard.press("Home");
  await page.getByLabel("Seconds per page").selectOption("2");
  await page.getByRole("button", { name: "Start autoplay", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Go to page" })).toHaveValue("2", { timeout: 4000 });
  await capturePresentation(page, info.project.name, "before", "standard");
  await page.getByRole("button", { name: "Exit presentation", exact: true }).click();
  await expect(page).toHaveURL(editor);
  await page.getByRole("button", { name: "More present options", exact: true }).click();
  const popup = context.waitForEvent("page");
  await page.getByRole("button", { name: "Presenter view", exact: true }).click();
  const audience = await popup;
  await expect(page.getByRole("heading", { name: "Notes", exact: true })).toBeVisible();
  await capturePresentation(page, info.project.name, "before", "presenter");
  await audience.close();
});
