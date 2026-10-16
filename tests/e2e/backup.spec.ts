import { waitForDesignSave } from "./fixtures";
import { readFile } from "node:fs/promises";
import { readDesignBackup } from "@/lib/design/backup-file";
import { expect, test } from "./fixtures";
import { captureFixtureRecovery } from "../../scripts/parity/fixture-recovery-evidence";

test("a downloaded backup imports into an empty browser library and stays editable", async ({ page }, testInfo) => {
  await page.goto("/canvaisdead/login");
  const cookies = page.getByRole("button", { name: "Accept all cookies" });
  if (await cookies.isVisible()) await cookies.click();
  await page.getByRole("button", { name: "Use the demo account" }).click();
  await expect(page.getByTestId("designs")).toBeVisible();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Back up designs", exact: true }).click();
  const download = await downloaded;
  const backupPath = (await download.path())!;
  const backup = { designs: await readDesignBackup(new Blob([await readFile(backupPath)])) };
  const expected = backup.designs[0];
  await page.evaluate(async () => {
    const key = (await window.designTestStorage.keys()).find(key => key.endsWith(":designs"))!;
    await window.designTestStorage.setItem(key, "[]");
  });
  await waitForDesignSave(page); await page.reload();
  await expect(page.getByTestId("designs").locator(".cd-card")).toHaveCount(0);
  await page.getByLabel("Import design backup").setInputFiles(backupPath);
  await expect(page.locator(".cv-design-files").getByRole("status")).toContainText("imported as new copies");
  await expect(page.getByTestId("designs").locator(".cd-card")).toHaveCount(backup.designs.length);
  await page.screenshot({ path: testInfo.outputPath("restored-library.png") });
  await page.getByRole("link", { name: `Open ${expected.name}`, exact: true }).click();
  await expect(page).not.toHaveURL(new RegExp(expected.id + "$"));
  await page.getByRole("textbox", { name: "Design name" }).fill("Restored and editable");
  await waitForDesignSave(page); await page.reload();
  await expect(page.getByRole("textbox", { name: "Design name" })).toHaveValue("Restored and editable");
  await page.screenshot({ path: testInfo.outputPath("restored-editor.png") });
});

test("invalid backup import leaves the project library unchanged", async ({ page }, info) => {
  await page.goto("/canvaisdead/login");
  const cookies = page.getByRole("button", { name: "Accept all cookies" });
  if (await cookies.isVisible()) await cookies.click();
  await page.getByRole("button", { name: "Use the demo account" }).click();
  await expect(page.getByTestId("designs")).toBeVisible();
  const before = await page.getByTestId("designs").locator(".cd-card").count();
  const original = await page.evaluate(() => window.designTestStorage.entries());
  await page.getByLabel("Import design backup").setInputFiles({ name: "broken.json", mimeType: "application/json", buffer: Buffer.from('{"format":"canvaisdead","version":1,"designs":[{}]}') });
  const files = page.locator(".cv-design-files"), error = files.getByRole("alert");
  await expect(error).toContainText("invalid design data");
  await expect(page.getByTestId("designs").locator(".cd-card")).toHaveCount(before);
  expect(await page.evaluate(() => window.designTestStorage.entries())).toEqual(original);
  await captureFixtureRecovery(page, info.project.name, "backup-rejected", files, { cards: before, libraryUnchanged: true });
  await page.reload(); await expect(page.getByTestId("designs").locator(".cd-card")).toHaveCount(before);
  expect(await page.evaluate(() => window.designTestStorage.entries())).toEqual(original);
});
