import { waitForDesignSave } from "./fixtures";
import { readFile } from "node:fs/promises";
import { readDesignBackup } from "@/lib/design/backup-file";
import { expect, test } from "./fixtures";

declare global { interface Window { restoreDesignStorage?: () => void } }

test.beforeEach(async ({ page }) => {
  await page.goto("/canvaisdead/login");
  const cookies = page.getByRole("button", { name: "Accept all cookies" });
  if (await cookies.isVisible()) await cookies.click();
  await page.getByRole("button", { name: "Use the demo account" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByTestId("designs")).toBeVisible();
});

test("storage failure is visible, backup is local, and retry persists the latest edit", async ({ page }, testInfo) => {
  await page.locator(".cx-qc").getByRole("button", { name: "Presentation", exact: true }).click();
  await expect(page.getByTestId("page")).toBeVisible();
  await page.evaluate(async () => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function(value, key) {
      if (this.name === "libraries") throw new DOMException("Storage full", "QuotaExceededError");
      return key === undefined ? original.call(this, value) : original.call(this, value, key);
    };
    window.restoreDesignStorage = () => { IDBObjectStore.prototype.put = original; };
  });
  await page.getByRole("textbox", { name: "Design name" }).fill("Local recovery test");
  await expect(page.getByRole("status", { name: "Changes have not been saved" })).toBeVisible();
  const notice = page.getByRole("alert").filter({ hasText: "could not be saved" });
  await expect(notice).toBeVisible();
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await page.getByRole("link", { name: "Open Local recovery test", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Design name" })).toHaveValue("Local recovery test");
  await expect(notice).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("storage-error.png") });
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download backup", exact: true }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe("canvaisdead-designs.canvaisdead");
  const backup = { designs: await readDesignBackup(new Blob([await readFile((await download.path())!)])) };
  expect(backup.designs.some((design: { name: string }) => design.name === "Local recovery test")).toBe(true);
  await page.evaluate(async () => window.restoreDesignStorage?.());
  await page.getByRole("button", { name: "Retry saving", exact: true }).click();
  await expect(notice).toHaveCount(0);
  await expect(page.getByRole("status", { name: "Saved in this browser only" })).toBeVisible();
  await waitForDesignSave(page); await page.reload();
  await expect(page.getByRole("textbox", { name: "Design name" })).toHaveValue("Local recovery test");
  await page.screenshot({ path: testInfo.outputPath("saved-after-reload.png") });
});

test("corrupt saved data is preserved and a failed read can be retried", async ({ page }) => {
  const original = await page.evaluate(async () => {
    const key = (await window.designTestStorage.keys()).find(key => key.endsWith(":designs"))!;
    const value = (await window.designTestStorage.getItem(key));
    await window.designTestStorage.setItem(key, "{broken");
    return { key, value };
  });
  await waitForDesignSave(page); await page.reload();
  const notice = page.getByRole("alert").filter({ hasText: "could not be read" });
  await expect(notice).toBeVisible();
  expect(await page.evaluate(async key => (await window.designTestStorage.getItem(key)), original.key)).toBe("{broken");
  await page.evaluate(async ({ key, value }) => await window.designTestStorage.setItem(key, value), original);
  await page.getByRole("button", { name: "Retry reading designs", exact: true }).click();
  await expect(page.getByTestId("designs")).toBeVisible();
  await expect(notice).toHaveCount(0);
});
