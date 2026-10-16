import { expect, test } from "../../tests/e2e/fixtures";
import { waitForDesignSave } from "../../tests/e2e/fixtures";
import { createPresentationDeck } from "./presentation-evidence";
import { captureEditorCache } from "./design-cache-evidence";

test("capture saved artwork on returning from a live presentation", async ({ page, context }, info) => {
  const editor = await createPresentationDeck(page);
  await page.getByRole("button", { name: "Text", exact: true }).click();
  await page.getByRole("button", { name: "Add a heading", exact: true }).click();
  const edit = async (target: typeof page, value: string) => {
    await target.getByTestId("page").locator("text").dblclick();
    await target.getByRole("textbox", { name: "Edit text", exact: true }).fill(value);
    await target.getByRole("textbox", { name: "Page title", exact: true }).focus();
    await waitForDesignSave(target);
  };
  await edit(page, "Live slide");
  const author = await context.newPage(); await author.goto(editor);
  await author.getByRole("tab", { name: "Page 2", exact: true }).click();
  await page.getByRole("button", { name: "Present", exact: true }).click();
  await expect(page.getByTestId("presentation-slide")).toContainText("Live slide");
  await edit(author, "Visible update");
  await author.getByRole("button", { name: "Notes", exact: true }).click();
  await author.getByLabel("Notes for page 2").fill("Private live note");
  await author.getByRole("button", { name: "Close notes", exact: true }).click(); await waitForDesignSave(author);
  await expect(page.getByTestId("presentation-slide")).toContainText("Visible update");
  await page.getByRole("main", { name: "Presentation", exact: true }).focus(); await page.keyboard.press("Escape");
  await expect(page).toHaveURL(editor); await page.getByRole("tab", { name: "Page 2", exact: true }).click();
  await captureEditorCache(page, info.project.name, "before"); await author.close();
});
