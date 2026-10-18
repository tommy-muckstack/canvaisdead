import { readFile } from "node:fs/promises";
import { expect, test, waitForDesignSave } from "./fixtures";
import { captureProjectPages, choice, fileLibrary, projectPanel, setupProjectPages, SINGLE, SOURCE, sourcePages, TARGET, targetDesign, targetPages } from "../../scripts/parity/project-pages-evidence";
import { designPages, MAX_PAGES } from "../../lib/design/pages";
import { readDesignBackup } from "../../lib/design/backup-file";

test("project page chooser preserves search and focus and applies one page to an unused blank", async ({ page }, info) => {
  const originals = await setupProjectPages(page), panel = await projectPanel(page);
  let metrics = await captureProjectPages(page, info.project.name, "after", "list"); expect(metrics.documentWidth).toBe(metrics.viewport.w);
  await panel.getByRole("textbox").fill("Source"); await panel.getByRole("button", { name: "Starred", exact: true }).click();
  await sourcePages(page); metrics = await captureProjectPages(page, info.project.name, "after", "chooser"); expect(metrics.documentWidth).toBe(metrics.viewport.w);
  await panel.getByRole("button", { name: "Back to designs", exact: true }).click(); await expect(panel.getByRole("textbox")).toHaveValue("Source"); await expect(panel.getByRole("button", { name: `View pages of ${SOURCE}`, exact: true })).toBeFocused();
  await sourcePages(page); await panel.getByRole("button", { name: "Use page 1: Intro", exact: true }).press("Enter"); await waitForDesignSave(page);
  await expect(choice(page)).toHaveCount(0); const pages = await targetPages(page); expect(pages).toHaveLength(1); expect(pages[0]).toMatchObject({ id: "target-0", title: "Intro", notes: "Source introduction notes", bg: "#e9e1ff" }); expect(pages[0].els[0]).toMatchObject({ text: "Reusable intro", x: 80, y: 120, w: 640, fontSize: 80 }); expect(pages[0].els[0].link).toBeUndefined();
  expect((await fileLibrary(page)).filter(d => d.id !== "page-target")).toEqual(originals.slice(1));
  if (await page.getByRole("button", { name: "Hide side panel", exact: true }).isVisible()) await page.getByRole("button", { name: "Hide side panel", exact: true }).click();
  await expect(page.getByTestId("page").getByText("Reusable intro")).toBeVisible(); await page.reload(); await expect(page.getByTestId("page")).toBeVisible(); expect(await targetPages(page)).toEqual(pages);
});

test("adding all source pages is one undo step with an accessible cancelable choice and independent source", async ({ page }, info) => {
  const originals = await setupProjectPages(page, true), panel = await sourcePages(page), all = panel.getByRole("button", { name: "Apply all 2 pages", exact: true });
  await all.click(); const dialog = choice(page); await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeFocused();
  const metrics = await captureProjectPages(page, info.project.name, "after", "choice"), box = metrics.panels.find(p => p.kind === "cv-project-choice")!;
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.w).toBeLessThanOrEqual(metrics.viewport.w); expect(box.y + box.h).toBeLessThanOrEqual(metrics.viewport.h);
  for (const button of await dialog.getByRole("button").all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(info.project.name === "mobile" ? 44 : 40);
  await dialog.getByRole("button", { name: "Add as new pages", exact: true }).focus(); await page.keyboard.press("Tab"); await expect(dialog.getByRole("button", { name: "Close page options", exact: true })).toBeFocused();
  await page.keyboard.press("Escape"); await expect(all).toBeFocused(); expect(await targetDesign(page)).toEqual(originals[0]);
  await all.click(); await page.mouse.click(1, 1); await expect(all).toBeFocused(); await all.click(); await dialog.getByRole("button", { name: "Add as new pages", exact: true }).click(); await waitForDesignSave(page);
  const applied = await targetDesign(page), pages = designPages(applied); expect(pages.map(p => p.title)).toEqual(["", "Intro", "Details"]); expect(pages[0]).toEqual(designPages(originals[0])[0]); expect(pages[1].els[0].link).toEqual({ kind: "page", pageId: pages[2].id }); expect(applied.starred).toBe(true); expect(applied.name).toBe(TARGET);
  expect((await fileLibrary(page)).filter(d => d.id !== "page-target")).toEqual(originals.slice(1));
  if (await page.getByRole("button", { name: "Hide side panel", exact: true }).isVisible()) await page.getByRole("button", { name: "Hide side panel", exact: true }).click();
  await captureProjectPages(page, info.project.name, "after", "applied");
  await page.getByRole("button", { name: "Undo", exact: true }).click(); await waitForDesignSave(page); expect(await targetPages(page)).toEqual(designPages(originals[0]));
  await page.getByRole("button", { name: "Redo", exact: true }).click(); await waitForDesignSave(page); expect(await targetPages(page)).toEqual(pages); await page.reload(); await expect(page.getByTestId("page")).toBeVisible(); expect(await targetPages(page)).toEqual(pages);
});

test("a single-page project can replace existing artwork and exports the fitted result", async ({ page }) => {
  const originals = await setupProjectPages(page, true), panel = await projectPanel(page); await panel.getByRole("button", { name: `Use ${SINGLE}`, exact: true }).click();
  await choice(page).getByRole("button", { name: "Replace current page", exact: true }).click(); await waitForDesignSave(page);
  const pages = await targetPages(page); expect(pages).toHaveLength(1); expect(pages[0].id).toBe("target-0"); expect(pages[0].els[0]).toMatchObject({ x: 220, y: 120, w: 360, fontSize: 45, text: "Poster copy" });
  expect((await fileLibrary(page)).filter(d => d.id !== "page-target")).toEqual(originals.slice(1));
  await page.getByRole("button", { name: "File", exact: true }).click(); await page.getByRole("menuitem", { name: "Download", exact: true }).click(); const download = page.getByRole("dialog", { name: "Download design", exact: true }); await download.getByRole("combobox", { name: "File type", exact: true }).selectOption("svg");
  const pending = page.waitForEvent("download"); await download.getByRole("button", { name: "Download", exact: true }).click(); const svg = await readFile((await (await pending).path())!, "utf8"); expect(svg).toContain("Poster copy"); expect(svg).not.toContain("Keep my original"); expect(svg).toContain('viewBox="0 0 800 600"');
});

test("same-document page reuse and real backup import preserve notes, links and independent identities", async ({ page }) => {
  await setupProjectPages(page); const panel = await sourcePages(page); await panel.getByRole("button", { name: "Apply all 2 pages", exact: true }).click(); await waitForDesignSave(page);
  await projectPanel(page); await panel.getByRole("button", { name: "Back to designs", exact: true }).click(); await panel.getByRole("button", { name: `View pages of ${TARGET}`, exact: true }).click();
  await panel.getByRole("button", { name: "Use page 1: Intro", exact: true }).click(); await choice(page).getByRole("button", { name: "Add as new page", exact: true }).click(); await waitForDesignSave(page);
  const source = await targetDesign(page), pages = designPages(source); expect(pages).toHaveLength(3); expect(pages[1].id).not.toBe(pages[0].id); expect(pages[1].els[0].id).not.toBe(pages[0].els[0].id); expect(pages[1].els[0].link).toEqual({ kind: "page", pageId: pages[2].id });
  await page.goto("/canvaisdead/app/projects"); const pending = page.waitForEvent("download"); await page.getByRole("button", { name: "Back up designs", exact: true }).click(); const path = (await (await pending).path())!, backup = await readDesignBackup(new Blob([await readFile(path)])); expect(backup.find(d => d.id === source.id)).toEqual(source);
  await page.getByLabel("Import design backup", { exact: true }).setInputFiles(path); await expect(page.getByText("3 designs imported as new copies.", { exact: true })).toBeVisible();
  const library = await fileLibrary(page), copy = library.find(d => d.name === TARGET && d.id !== source.id)!; expect(library).toHaveLength(6); expect(library.find(d => d.id === source.id)).toEqual(source); expect(copy.starred).toBe(true); const copied = designPages(copy); expect(copied[1].notes).toBe(pages[1].notes); expect(copied[1].els[0].link).toEqual({ kind: "page", pageId: copied[2].id });
});

test("failed page saves retain the source and recover the applied pages through backup and retry", async ({ page }, info) => {
  const original = await setupProjectPages(page), panel = await sourcePages(page);
  await page.evaluate(() => { const put = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function(value, key) { if (this.name === "libraries") throw new DOMException("Full", "QuotaExceededError"); return key === undefined ? put.call(this, value) : put.call(this, value, key); }; window.restoreDesignStorage = () => { IDBObjectStore.prototype.put = put; }; });
  await panel.getByRole("button", { name: "Apply all 2 pages", exact: true }).click(); const notice = page.getByRole("alert").filter({ hasText: "could not be saved" }); await expect(notice).toBeVisible(); expect(await fileLibrary(page)).toEqual(original);
  await projectPanel(page); await expect(panel.getByRole("button", { name: "Apply all 2 pages", exact: true })).toBeDisabled(); await captureProjectPages(page, info.project.name, "after", "failure");
  const noticeBox = (await notice.boundingBox())!, toolbarBox = (await page.locator(".cv-ctx").boundingBox())!; expect(toolbarBox.y).toBeGreaterThanOrEqual(noticeBox.y + noticeBox.height);
  for (const button of await notice.getByRole("button").all()) expect(await button.evaluate(node => { const box = node.getBoundingClientRect(), hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2); return !!hit && node.contains(hit); })).toBe(true);
  const pending = page.waitForEvent("download"); await page.getByRole("button", { name: "Download backup", exact: true }).click(); const backup = await readDesignBackup(new Blob([await readFile((await (await pending).path())!)])); expect(designPages(backup.find(d => d.id === "page-target")!)).toHaveLength(2); expect(backup.filter(d => d.id !== "page-target")).toEqual(original.slice(1));
  await page.evaluate(() => window.restoreDesignStorage?.()); await page.getByRole("button", { name: "Retry saving", exact: true }).click(); await waitForDesignSave(page); expect(await fileLibrary(page)).toEqual(backup); await page.reload(); await expect(page.getByTestId("page")).toBeVisible(); expect(await targetPages(page)).toHaveLength(2);
});

test("page-cap choices prevent overflow while allowing a single-page replacement", async ({ page }, info) => {
  const original = await setupProjectPages(page, true, MAX_PAGES), panel = await sourcePages(page); await panel.getByRole("button", { name: "Apply all 2 pages", exact: true }).click();
  await expect(choice(page).getByRole("button", { name: "Replace current page", exact: true })).toBeDisabled(); await expect(choice(page).getByRole("button", { name: "Add as new pages", exact: true })).toBeDisabled(); await captureProjectPages(page, info.project.name, "after", "limit");
  await page.keyboard.press("Escape"); expect(await fileLibrary(page)).toEqual(original); await panel.getByRole("button", { name: "Use page 2: Details", exact: true }).click(); await expect(choice(page).getByRole("button", { name: "Add as new page", exact: true })).toBeDisabled();
  await choice(page).getByRole("button", { name: "Replace current page", exact: true }).click(); await waitForDesignSave(page); expect(await targetPages(page)).toHaveLength(MAX_PAGES); expect((await targetPages(page))[0].title).toBe("Details");
});

test("native project dragging and the mobile keyboard equivalent apply independent pages", async ({ page }, info) => {
  const original = await setupProjectPages(page), panel = await sourcePages(page), button = panel.getByRole("button", { name: "Use page 2: Details", exact: true });
  if (info.project.name === "desktop") await button.dragTo(page.getByTestId("page")); else { await button.focus(); await button.press("Enter"); }
  await waitForDesignSave(page); expect((await targetPages(page))[0].title).toBe("Details"); expect((await fileLibrary(page)).filter(d => d.id !== "page-target")).toEqual(original.slice(1));
  await page.getByRole("button", { name: "Undo", exact: true }).click(); await waitForDesignSave(page); expect(await targetPages(page)).toEqual(designPages(original[0]));
});

test("another tab changing a source disables an already open page choice without overwriting files", async ({ page, context }) => {
  await setupProjectPages(page, true); const panel = await sourcePages(page); await panel.getByRole("button", { name: "Apply all 2 pages", exact: true }).click();
  const other = await context.newPage(); await other.goto("/canvaisdead/app/projects"); await other.getByRole("button", { name: `Rename ${SOURCE}`, exact: true }).click(); const name = other.getByRole("textbox", { name: "Design name", exact: true }); await name.fill("Source changed elsewhere"); await name.press("Enter");
  await expect(choice(page).getByRole("alert")).toContainText("changed in another tab"); await expect(choice(page).getByRole("button", { name: "Add as new pages", exact: true })).toBeDisabled(); await expect(choice(page).getByRole("button", { name: "Replace current page", exact: true })).toBeDisabled();
  expect((await fileLibrary(page)).find(d => d.id === "page-source")!.name).toBe("Source changed elsewhere"); expect((await targetPages(page))[0].els[0].text).toBe("Keep my original"); await page.keyboard.press("Escape"); await expect(page.getByRole("alert").filter({ hasText: "changed in another tab" })).toBeVisible(); await other.close();
});
