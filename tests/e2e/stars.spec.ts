import { readFile } from "node:fs/promises";
import { expect, test, waitForDesignSave } from "./fixtures";
import { captureStars, FAVORITE, OTHER, favoriteSaved, fileLibrary, setupStars } from "../../scripts/parity/stars-evidence";
import { readDesignBackup } from "../../lib/design/backup-file";
import { designPages } from "../../lib/design/pages";

test.beforeEach(async ({ page }) => { await setupStars(page); });

test("card stars and Starred navigation support keyboard, search, empty state and durable local metadata", async ({ page }, info) => {
  const original = await fileLibrary(page), metrics = await captureStars(page, info.project.name, "after", "projects"); expect(metrics.documentWidth).toBe(metrics.viewport.w);
  const button = page.getByRole("button", { name: `Star ${FAVORITE}`, exact: true }); await button.focus(); await button.press("Enter"); await favoriteSaved(page);
  expect(await fileLibrary(page)).toEqual(original.map(d => d.id === "favorite-design" ? { ...d, starred: true } : d));
  await expect(page.getByRole("button", { name: `Unstar ${FAVORITE}`, exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("link", { name: "Starred", exact: true }).click(); await expect(page.getByRole("heading", { name: "Starred", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: `Open ${OTHER}`, exact: true })).toHaveCount(0); await captureStars(page, info.project.name, "after", "starred");
  const search = page.getByRole("textbox", { name: "Search Starred", exact: true }); await search.fill("missing"); await expect(page.getByText("No designs match your search.", { exact: true })).toBeVisible(); await search.fill("FAVORITE");
  await expect(page.getByRole("link", { name: `Open ${FAVORITE}`, exact: true })).toBeVisible(); await page.reload(); await expect(page.getByRole("button", { name: `Unstar ${FAVORITE}`, exact: true })).toBeVisible();
  await page.getByRole("button", { name: `Unstar ${FAVORITE}`, exact: true }).click(); await favoriteSaved(page, false); await expect(page.getByRole("heading", { name: "No starred designs yet", exact: true })).toBeVisible(); await expect(page.locator(".cd-library")).toBeFocused();
  const browse = page.getByRole("link", { name: "Browse all projects", exact: true }); expect((await browse.boundingBox())!.height).toBeGreaterThanOrEqual(info.project.name === "mobile" ? 44 : 40);
  await captureStars(page, info.project.name, "after", "empty"); expect(await fileLibrary(page)).toEqual(original);
  await page.getByRole("link", { name: "Browse all projects", exact: true }).click(); await expect(page.getByRole("link", { name: `Open ${OTHER}`, exact: true })).toBeVisible();
});

test("More and Home favorites survive rename, copy, Trash and restoration without starring new copies", async ({ page }, info) => {
  const more = page.getByRole("button", { name: `More options for ${FAVORITE}`, exact: true }); await more.press("ArrowDown");
  await captureStars(page, info.project.name, "after", "menu"); await page.getByRole("menuitem", { name: "Star for you", exact: true }).click(); await favoriteSaved(page);
  await page.goto("/canvaisdead/app"); const cards = page.getByTestId("designs"); await expect(cards.getByRole("button", { name: `Unstar ${FAVORITE}`, exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Starred", exact: true }).click(); await page.getByRole("button", { name: `Rename ${FAVORITE}`, exact: true }).click(); const name = page.getByRole("textbox", { name: "Design name", exact: true }); await name.fill("Renamed favorite"); await name.press("Enter");
  await page.getByRole("button", { name: "More options for Renamed favorite", exact: true }).click(); await page.getByRole("menuitem", { name: "Make a copy", exact: true }).click();
  await expect.poll(async () => (await fileLibrary(page)).length).toBe(3); const copy = (await fileLibrary(page)).find(d => d.name === "Copy of Renamed favorite")!; expect(copy.starred).toBeUndefined(); await expect(cards.locator(".cd-card")).toHaveCount(1);
  await page.getByRole("button", { name: "More options for Renamed favorite", exact: true }).click(); await page.getByRole("menuitem", { name: "Move to Trash", exact: true }).click(); await expect(cards.locator(".cd-card")).toHaveCount(0);
  await page.getByRole("link", { name: "Trash", exact: true }).click(); await page.getByRole("button", { name: "More options for Renamed favorite", exact: true }).click(); await page.getByRole("menuitem", { name: "Restore", exact: true }).click();
  await page.getByRole("link", { name: "Starred", exact: true }).click(); await expect(page.getByRole("button", { name: "Unstar Renamed favorite", exact: true })).toBeVisible(); await page.reload(); await expect(cards.locator(".cd-card")).toHaveCount(1);
});

test("editor Projects stars are separate from artwork undo and preserve search across panels", async ({ page }, info) => {
  const original = (await fileLibrary(page))[0]; await page.getByRole("link", { name: `Open ${FAVORITE}`, exact: true }).click(); await expect(page.getByTestId("page")).toBeVisible(); await page.getByRole("button", { name: "Projects", exact: true }).click();
  const panel = page.getByRole("region", { name: "Projects panel", exact: true }); await expect(panel).toBeVisible(); const more = panel.getByRole("button", { name: `More options for ${FAVORITE}`, exact: true }); await more.click(); await expect(page.getByRole("menuitem", { name: "Star for you", exact: true })).toBeFocused(); await page.keyboard.press("Escape"); await expect(more).toBeFocused();
  await panel.getByRole("button", { name: `Star ${FAVORITE}`, exact: true }).click(); await favoriteSaved(page); await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeDisabled();
  await panel.getByRole("button", { name: "Starred", exact: true }).click(); await panel.getByRole("textbox", { name: "Search your projects", exact: true }).fill("Favorite"); const clearSearch = panel.getByRole("button", { name: "Clear project search", exact: true }); expect((await clearSearch.boundingBox())!.height).toBeGreaterThanOrEqual(info.project.name === "mobile" ? 44 : 40); await clearSearch.click(); await expect(panel.getByRole("textbox")).toHaveValue(""); await panel.getByRole("textbox").fill("Favorite"); await captureStars(page, info.project.name, "after", "editor");
  await page.getByRole("button", { name: "Text", exact: true }).click(); await page.getByRole("button", { name: "Add a heading", exact: true }).click(); await waitForDesignSave(page); await favoriteSaved(page);
  await page.getByRole("button", { name: "Undo", exact: true }).click(); await waitForDesignSave(page); expect(designPages((await fileLibrary(page)).find(d => d.id === original.id)!)).toEqual(designPages(original)); await favoriteSaved(page);
  await page.getByRole("button", { name: "Projects", exact: true }).click(); await expect(panel.getByRole("textbox")).toHaveValue("Favorite"); await expect(panel.getByRole("button", { name: "Starred", exact: true })).toHaveAttribute("aria-pressed", "true");
  await panel.getByRole("button", { name: `Unstar ${FAVORITE}`, exact: true }).click(); await favoriteSaved(page, false); await page.getByRole("button", { name: "Redo", exact: true }).click(); await waitForDesignSave(page); await favoriteSaved(page, false);
  await page.reload(); await expect(page.getByTestId("page")).toBeVisible(); await page.getByRole("button", { name: "Projects", exact: true }).click(); await expect(panel.getByRole("button", { name: `Star ${FAVORITE}`, exact: true })).toBeVisible();
  await panel.getByRole("link", { name: `Open ${OTHER}`, exact: true }).click(); await expect(page.getByRole("textbox", { name: "Design name", exact: true })).toHaveValue(OTHER);
});

test("downloaded backups and imported copies preserve personal favorites and complete artwork", async ({ page }) => {
  await page.getByRole("button", { name: `Star ${FAVORITE}`, exact: true }).click(); await favoriteSaved(page); const source = await fileLibrary(page);
  const pending = page.waitForEvent("download"); await page.getByRole("button", { name: "Back up designs", exact: true }).click(); const path = (await (await pending).path())!, bytes = await readFile(path), backup = await readDesignBackup(new Blob([bytes])); expect(backup).toEqual(source);
  expect(bytes.toString("utf8").split("\n")[0]).toContain('"version":12'); await page.getByLabel("Import design backup", { exact: true }).setInputFiles(path); await expect(page.getByText("2 designs imported as new copies.", { exact: true })).toBeVisible();
  const library = await fileLibrary(page); expect(library.filter(d => d.starred)).toHaveLength(2); expect(library.filter(d => source.some(original => original.id === d.id))).toEqual(source);
  const copy = library.find(d => d.starred && d.id !== "favorite-design")!; expect(copy.name).toBe(FAVORITE); const pages = designPages(copy); expect(pages[0].notes).toBe("Private favorite notes"); expect(pages[0].els[0].link).toEqual({ kind: "page", pageId: pages[1].id });
  await page.getByRole("link", { name: "Starred", exact: true }).click(); await expect(page).toHaveURL(/\/app\/projects\?view=starred$/); await expect(page.getByRole("heading", { name: "Starred", exact: true })).toBeVisible(); await expect(page.getByTestId("designs").locator(".cd-card")).toHaveCount(2);
  await page.reload(); await expect(page.getByTestId("designs").locator(".cd-card")).toHaveCount(2);
});

test("failed favorite writes keep an honest notice, a recoverable backup and the same retryable change", async ({ page }, info) => {
  const original = await fileLibrary(page);
  await page.evaluate(() => { const put = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function(value, key) { if (this.name === "libraries") throw new DOMException("Full", "QuotaExceededError"); return key === undefined ? put.call(this, value) : put.call(this, value, key); }; window.restoreDesignStorage = () => { IDBObjectStore.prototype.put = put; }; });
  await page.getByRole("button", { name: `Star ${FAVORITE}`, exact: true }).click(); const notice = page.getByRole("alert").filter({ hasText: "could not be saved" }); await expect(notice).toBeVisible(); await expect(page.getByRole("button", { name: `Unstar ${FAVORITE}`, exact: true })).toBeDisabled(); expect(await fileLibrary(page)).toEqual(original);
  for (const button of await notice.getByRole("button").all()) expect(await button.evaluate(node => { const box = node.getBoundingClientRect(), hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2); return !!hit && node.contains(hit); })).toBe(true);
  await captureStars(page, info.project.name, "after", "failure"); const pending = page.waitForEvent("download"); await page.getByRole("button", { name: "Download backup", exact: true }).click(); const backup = await readDesignBackup(new Blob([await readFile((await (await pending).path())!)])); expect(backup[0]).toEqual({ ...original[0], starred: true });
  await page.evaluate(() => window.restoreDesignStorage?.()); await page.getByRole("button", { name: "Retry saving", exact: true }).click(); await favoriteSaved(page); await expect(notice).toHaveCount(0); await page.reload(); await expect(page.getByRole("button", { name: `Unstar ${FAVORITE}`, exact: true })).toBeEnabled(); expect((await fileLibrary(page)).length).toBe(original.length);
});

test("another open tab detects favorite changes without overwriting either artwork snapshot", async ({ page, context }) => {
  const other = await context.newPage(); await other.goto("/canvaisdead/app/projects"); await expect(other.getByRole("button", { name: `Star ${FAVORITE}`, exact: true })).toBeVisible();
  const original = await fileLibrary(page); await page.getByRole("button", { name: `Star ${FAVORITE}`, exact: true }).click(); await favoriteSaved(page);
  await expect(other.getByRole("alert").filter({ hasText: "changed in another tab" })).toBeVisible(); await expect(other.getByRole("button", { name: `Star ${FAVORITE}`, exact: true })).toBeDisabled();
  expect(await fileLibrary(page)).toEqual(original.map(d => d.id === "favorite-design" ? { ...d, starred: true } : d)); await other.reload(); await expect(other.getByRole("button", { name: `Unstar ${FAVORITE}`, exact: true })).toBeVisible(); await other.close();
});

test("editor File copies of a reopened starred design are independent and initially unstarred", async ({ page }) => {
  await page.getByRole("button", { name: `Star ${FAVORITE}`, exact: true }).click(); await favoriteSaved(page); const source = (await fileLibrary(page)).find(d => d.id === "favorite-design")!;
  await page.getByRole("link", { name: `Open ${FAVORITE}`, exact: true }).click(); await expect(page.getByTestId("page")).toBeVisible(); await waitForDesignSave(page);
  await page.getByRole("button", { name: "File", exact: true }).click(); await page.getByRole("menuitem", { name: "Make a copy", exact: true }).click(); await expect(page.getByRole("textbox", { name: "Design name", exact: true })).toHaveValue(`Copy of ${FAVORITE}`); await waitForDesignSave(page);
  const library = await fileLibrary(page), copy = library.find(d => d.id !== source.id && d.name === `Copy of ${FAVORITE}`)!;
  expect(copy.starred).toBeUndefined(); expect(library.find(d => d.id === source.id)).toEqual(source); expect(designPages(copy)[0].notes).toBe("Private favorite notes"); expect(designPages(copy)[0].els[0].link).toEqual({ kind: "page", pageId: designPages(copy)[1].id });
  await page.getByRole("button", { name: "Projects", exact: true }).click(); const panel = page.getByRole("region", { name: "Projects panel", exact: true }); await expect(panel.getByRole("button", { name: `Star Copy of ${FAVORITE}`, exact: true })).toBeVisible();
});
