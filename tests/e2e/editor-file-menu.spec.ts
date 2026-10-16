import { readFile } from "node:fs/promises";
import { expect, test, waitForDesignSave } from "./fixtures";
import { captureFileMenu, fileLibrary, setupFileMenu } from "../../scripts/parity/file-menu-evidence";
import { designPages } from "@/lib/design/pages";
import type { Design } from "@/lib/design/types";
import { readDesignBackup } from "@/lib/design/backup-file";

function content(design: Design) {
  return { w: design.w, h: design.h, pages: designPages(design).map(page => {
    const groups = new Map<string, string>();
    return { ...page, id: undefined, els: page.els.map(element => ({ ...element, id: undefined, groupPath: element.groupPath?.map(group => {
      if (!groups.has(group)) groups.set(group, `group-${groups.size}`); return groups.get(group);
    }) })) };
  }) };
}
test.beforeEach(async ({ page }) => { await setupFileMenu(page); });

test("File menu opens by keyboard, fits the viewport and restores focus", async ({ page }, info) => {
  const file = page.getByRole("button", { name: "File", exact: true }), menu = page.getByRole("menu", { name: "File", exact: true });
  await captureFileMenu(page, info.project.name, "after", "closed");
  await file.focus(); await file.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Create a new design", exact: true })).toBeFocused();
  const observation = await captureFileMenu(page, info.project.name, "after", "activated"), box = observation.metrics.menu!;
  expect(box.x).toBeGreaterThanOrEqual(8); expect(box.x + box.w).toBeLessThanOrEqual(observation.metrics.viewport.w - 8);
  expect(box.y + box.h).toBeLessThanOrEqual(observation.metrics.viewport.h - 8); expect(observation.metrics.documentWidth).toBeLessThanOrEqual(observation.metrics.viewport.w);
  await page.keyboard.press("End"); await expect(page.getByRole("menuitem", { name: "Download", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowDown"); await expect(page.getByRole("menuitem", { name: "Create a new design", exact: true })).toBeFocused();
  await page.keyboard.press("Escape"); await expect(menu).toHaveCount(0); await expect(file).toBeFocused();
  await file.press("ArrowUp"); await expect(page.getByRole("menuitem", { name: "Download", exact: true })).toBeFocused();
  await page.getByRole("textbox", { name: "Design name", exact: true }).click(); await expect(menu).toHaveCount(0);
  await file.click(); await page.keyboard.press("Tab"); await expect(menu).toHaveCount(0); await expect(page.getByRole("button", { name: "Resize", exact: true })).toBeFocused();
});

test("File copy preserves edited pages, private notes, locks, groups and original image bytes", async ({ page }) => {
  const originalId = page.url().split("/").at(-1)!, file = page.getByRole("button", { name: "File", exact: true });
  await page.getByTestId("page").locator("text").dblclick();
  const text = page.getByRole("textbox", { name: "Edit text", exact: true }); await text.fill("Newest artwork in the copy"); await text.press("Escape");
  await page.getByRole("tablist", { name: "Design pages", exact: true }).getByRole("tab", { name: "Page 2: Details", exact: true }).click();
  await page.getByRole("button", { name: "Notes", exact: true }).click(); await page.getByRole("textbox", { name: "Notes for page 2", exact: true }).fill("Newest private notes");
  await page.getByRole("button", { name: "Close notes", exact: true }).click();
  await file.click(); await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
  const name = page.getByRole("textbox", { name: "Design name", exact: true }); await expect(name).toBeFocused(); await name.fill("Freshly edited file"); await name.press("Tab"); await waitForDesignSave(page);
  const before = await fileLibrary(page), source = before.find(d => d.id === originalId)!;
  await file.click(); await page.getByRole("menuitem", { name: "Make a copy", exact: true }).click();
  await expect(page).not.toHaveURL(new RegExp(`${originalId}$`)); await expect(name).toHaveValue("Copy of Freshly edited file"); await waitForDesignSave(page);
  const copyId = page.url().split("/").at(-1)!, library = await fileLibrary(page), copy = library.find(d => d.id === copyId)!;
  expect(library).toHaveLength(before.length + 1); expect(library.find(d => d.id === originalId)).toEqual(source); expect(content(copy)).toEqual(content(source));
  const originalIds = new Set(designPages(source).flatMap(p => [p.id, ...p.els.map(e => e.id), ...p.els.flatMap(e => e.groupPath ?? [])]));
  for (const id of designPages(copy).flatMap(p => [p.id, ...p.els.map(e => e.id), ...p.els.flatMap(e => e.groupPath ?? [])])) expect(originalIds.has(id)).toBe(false);
  await name.fill("Independent copy"); await name.press("Tab"); await waitForDesignSave(page); await page.reload(); await expect(name).toHaveValue("Independent copy");
  expect((await fileLibrary(page)).find(d => d.id === originalId)).toEqual(source);
  await page.getByRole("link", { name: "Home", exact: true }).click(); await expect(page.getByRole("link", { name: "Open Independent copy", exact: true })).toBeVisible(); await expect(page.getByRole("link", { name: "Open Freshly edited file", exact: true })).toBeVisible();
});

test("a failed File copy recovered by another edit is reopened without duplicating it again", async ({ page }) => {
  const before = await fileLibrary(page), originalId = page.url().split("/").at(-1)!;
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function(value, key) { if (this.name === "libraries") throw new DOMException("Full", "QuotaExceededError"); return key === undefined ? original.call(this, value) : original.call(this, value, key); };
    window.restoreDesignStorage = () => { IDBObjectStore.prototype.put = original; };
  });
  const file = page.getByRole("button", { name: "File", exact: true }); await file.click(); await page.getByRole("menuitem", { name: "Make a copy", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "could not be saved" })).toBeVisible();
  await page.evaluate(() => window.restoreDesignStorage?.());
  await page.getByRole("textbox", { name: "Design name", exact: true }).fill("Original after recovery"); await waitForDesignSave(page);
  const recovered = await fileLibrary(page), copy = recovered.find(d => d.name === "Copy of File actions")!;
  expect(recovered).toHaveLength(before.length + 1); expect(copy).toBeDefined(); await expect(page).toHaveURL(new RegExp(`${originalId}$`));
  await file.click(); await page.getByRole("menuitem", { name: "Make a copy", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${copy.id}$`)); await waitForDesignSave(page); expect(await fileLibrary(page)).toEqual(recovered);
});

test("File creation uses the real picker and download retains its File focus target", async ({ page }) => {
  const file = page.getByRole("button", { name: "File", exact: true }), source = (await fileLibrary(page)).find(d => d.id === page.url().split("/").at(-1))!;
  await file.click(); await page.getByRole("menuitem", { name: "Download", exact: true }).click();
  const download = page.getByRole("dialog", { name: "Download design", exact: true });
  await expect(download.getByRole("combobox", { name: "File type", exact: true })).toBeFocused();
  await download.getByRole("combobox", { name: "File type", exact: true }).selectOption("svg");
  await download.getByRole("combobox", { name: "Select pages", exact: true }).selectOption("current");
  const pending = page.waitForEvent("download"); await download.getByRole("button", { name: "Download", exact: true }).click();
  const output = await pending, svg = await readFile((await output.path())!, "utf8");
  const exportedText = await page.evaluate(source => Array.from(new DOMParser().parseFromString(source, "image/svg+xml").querySelectorAll("tspan"), node => node.textContent).join(" "), svg);
  expect(exportedText).toContain("Lose the subscription"); expect(svg).not.toContain("Private cover notes");
  await page.keyboard.press("Escape"); await expect(file).toBeFocused();
  await file.click(); await page.getByRole("menuitem", { name: "Create a new design", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Create a design", exact: true }); await expect(dialog).toBeVisible(); await page.keyboard.press("Escape"); await expect(file).toBeFocused();
  await file.click(); await page.getByRole("menuitem", { name: "Create a new design", exact: true }).click();
  await dialog.getByRole("button", { name: "Logo 500 × 500 px", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Design name", exact: true })).toHaveValue("Untitled design - Logo"); await expect(dialog).toHaveCount(0); await waitForDesignSave(page);
  expect((await fileLibrary(page)).find(d => d.id === source.id)).toEqual(source);
});

test("failed File copies retain one recoverable copy and retry before navigating", async ({ page }) => {
  const before = await fileLibrary(page), url = page.url();
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function(value, key) { if (this.name === "libraries") throw new DOMException("Full", "QuotaExceededError"); return key === undefined ? original.call(this, value) : original.call(this, value, key); };
    window.restoreDesignStorage = () => { IDBObjectStore.prototype.put = original; };
  });
  const file = page.getByRole("button", { name: "File", exact: true }); await file.click(); await page.getByRole("menuitem", { name: "Make a copy", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "could not be saved" })).toBeVisible(); await expect(page).toHaveURL(url); expect(await fileLibrary(page)).toEqual(before);
  await file.click(); await expect(page.getByRole("menuitem", { name: "Make a copy", exact: true })).toBeDisabled(); await page.keyboard.press("Escape");
  const pending = page.waitForEvent("download"); await page.getByRole("button", { name: "Download backup", exact: true }).click();
  const backup = await readDesignBackup(new Blob([await readFile((await (await pending).path())!)])); expect(backup).toHaveLength(before.length + 1);
  const copy = backup.find(d => d.name === "Copy of File actions")!; expect(copy).toBeDefined();
  await page.evaluate(() => window.restoreDesignStorage?.()); await page.getByRole("button", { name: "Retry saving", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${copy.id}$`)); await expect(page.getByRole("textbox", { name: "Design name", exact: true })).toHaveValue(copy.name); await waitForDesignSave(page);
  expect(await fileLibrary(page)).toHaveLength(before.length + 1); await page.reload(); await expect(page.getByRole("textbox", { name: "Design name", exact: true })).toHaveValue(copy.name);
});

test("leaving during a queued File copy prevents late editor navigation", async ({ page }) => {
  const before = await fileLibrary(page);
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("canvaisdead-designs", 1); request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction("libraries", "readwrite"), store = tx.objectStore("libraries"); let holding = true; const deadline = Date.now() + 15000;
        (window as unknown as { releaseFileCopy: () => void }).releaseFileCopy = () => { holding = false; };
        const hold = () => { const request = store.get("fixture-lock"); request.onsuccess = () => { if (holding && Date.now() < deadline) hold(); }; };
        hold(); tx.oncomplete = () => db.close(); tx.onabort = () => db.close(); resolve();
      };
    });
  });
  await page.getByRole("button", { name: "File", exact: true }).click(); await page.getByRole("menuitem", { name: "Make a copy", exact: true }).click();
  await expect(page.getByRole("status", { name: "Saving in this browser…", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Home", exact: true }).click(); await expect(page).toHaveURL(/\/app$/);
  await page.evaluate(() => (window as unknown as { releaseFileCopy: () => void }).releaseFileCopy());
  await expect.poll(async () => (await fileLibrary(page)).length).toBe(before.length + 1); await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("link", { name: "Open Copy of File actions", exact: true })).toBeVisible();
});
