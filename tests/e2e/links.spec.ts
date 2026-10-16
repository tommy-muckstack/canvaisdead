import { readFile } from "node:fs/promises";
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFString } from "pdf-lib";
import { test, expect, waitForDesignSave, type Page } from "./fixtures";
import { captureLinks, fileLibrary, LINK_URL, openElementLink, selectLinkedElement, setWebsiteLink, setupLinks } from "../../scripts/parity/links-evidence";
import { designPages } from "../../lib/design/pages";
import { readDesignBackup } from "../../lib/design/backup-file";

test.beforeEach(async ({ page, context }) => { await context.grantPermissions(["clipboard-read", "clipboard-write"]); await setupLinks(page); });
const openDesign = async (page: Page) => (await fileLibrary(page)).find(d => d.name === "Linked design")!;
const elements = async (page: Page) => designPages(await openDesign(page))[0].els;
async function pageLink(page: Page) { const dialog = await openElementLink(page); await dialog.getByRole("button", { name: "Page 2: Details", exact: true }).click(); await waitForDesignSave(page); }
async function download(page: Page, format: string, current = false) {
  await page.getByRole("button", { name: "File", exact: true }).click(); await page.getByRole("menuitem", { name: "Download", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Download design", exact: true }); await dialog.getByRole("combobox", { name: "File type", exact: true }).selectOption(format);
  if (current) await dialog.getByRole("combobox", { name: "Select pages", exact: true }).selectOption("current");
  const pending = page.waitForEvent("download"); await dialog.getByRole("button", { name: "Download", exact: true }).click(); const bytes = await readFile((await (await pending).path())!); await page.keyboard.press("Escape"); return bytes;
}

test("element links validate, cancel, save, undo, redo and reload with a bounded keyboard-accessible popover", async ({ page }, info) => {
  const before = await elements(page); await captureLinks(page, info.project.name, "after", "selected");
  let dialog = await openElementLink(page); const field = dialog.getByRole("textbox", { name: "Enter a link or search", exact: true }); await expect(field).toBeFocused();
  const metrics = await captureLinks(page, info.project.name, "after", "link"); expect(metrics.documentWidth).toBe(metrics.viewport.w); expect(metrics.panel!.x).toBeGreaterThanOrEqual(0); expect(metrics.panel!.x + metrics.panel!.w).toBeLessThanOrEqual(metrics.viewport.w); expect(metrics.panel!.y + metrics.panel!.h).toBeLessThanOrEqual(metrics.viewport.h);
  await field.fill("javascript:alert(1)"); await field.press("Enter"); await expect(dialog.getByRole("alert")).toBeVisible(); expect(await elements(page)).toEqual(before);
  await field.press("Escape"); await expect(dialog).toHaveCount(0); await expect(page.getByRole("button", { name: "Link", exact: true })).toBeFocused();
  await setWebsiteLink(page); expect((await elements(page))[0]).toEqual({ ...before[0], link: { kind: "url", url: LINK_URL } }); await captureLinks(page, info.project.name, "after", "linked");
  dialog = await openElementLink(page); await dialog.getByRole("button", { name: "Copy link", exact: true }).click(); await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(LINK_URL); await expect(dialog.getByRole("status")).toHaveText("Link copied."); await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Undo", exact: true }).click(); await waitForDesignSave(page); expect(await elements(page)).toEqual(before);
  await page.getByRole("button", { name: "Redo", exact: true }).click(); await waitForDesignSave(page); await page.reload(); await selectLinkedElement(page, "text"); dialog = await openElementLink(page); await expect(dialog.getByRole("textbox")).toHaveValue(LINK_URL);
  await dialog.getByRole("button", { name: "Remove link", exact: true }).click(); await waitForDesignSave(page); expect(await elements(page)).toEqual(before);
});

test("page links are reachable through More and shortcuts and navigate presentations by keyboard", async ({ page }, info) => {
  await page.getByRole("button", { name: "More", exact: true }).click(); await page.getByRole("menuitem", { name: "Link", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "Link", exact: true }); await dialog.getByRole("textbox").fill("Details"); await expect(dialog.getByRole("button", { name: "Page 1: Start", exact: true })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Page 2: Details", exact: true }).click(); await waitForDesignSave(page);
  await page.getByTestId("page").focus(); await page.keyboard.press("ControlOrMeta+k"); dialog = page.getByRole("dialog", { name: "Link", exact: true }); await expect(dialog.getByRole("textbox")).toHaveValue("Page 2: Details"); await captureLinks(page, info.project.name, "after", "page"); await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Present", exact: true }).click(); const main = page.getByRole("main", { name: "Presentation", exact: true }); await expect(main).toBeVisible();
  const link = main.getByRole("link", { name: "Explore the details: Page 2: Details", exact: true }); await expect(link).toBeVisible(); await link.focus(); await captureLinks(page, info.project.name, "after", "presentation"); await link.press("Enter");
  await expect(main.getByRole("spinbutton", { name: "Go to page" })).toHaveValue("2"); await expect(main.getByText("You found the details", { exact: true })).toBeVisible();
});

test("text, shapes and images open website links only on deliberate presentation activation", async ({ page, context }) => {
  let requests = 0; await context.route("https://example.test/**", async route => { requests++; await route.fulfill({ contentType: "text/html", body: "<title>Local link destination</title><p>Local test destination</p>" }); });
  for (const type of ["text", "shape", "image"] as const) { await selectLinkedElement(page, type); await setWebsiteLink(page); }
  await page.reload(); expect(requests).toBe(0); await page.getByRole("button", { name: "Present", exact: true }).click(); const main = page.getByRole("main", { name: "Presentation", exact: true }); await expect(main).toBeVisible(); expect(requests).toBe(0);
  const links = main.locator("a.cv-artwork-link"); await expect(links).toHaveCount(3);
  for (let i = 0; i < 3; i++) {
    const pending = context.waitForEvent("page"); await links.nth(i).click(); const opened = await pending; await expect(opened).toHaveTitle("Local link destination"); expect(await opened.evaluate(() => window.opener === null)).toBe(true); await opened.close();
    await expect(main.getByRole("spinbutton", { name: "Go to page" })).toHaveValue("1");
  }
  expect(requests).toBe(3);
});

test("multi-selection links are one history step and locked elements cannot be changed", async ({ page }) => {
  const before = await elements(page); await page.getByTestId("page").focus(); await page.keyboard.press("ControlOrMeta+a"); await setWebsiteLink(page);
  expect((await elements(page)).every(e => e.link?.kind === "url" && e.link.url === LINK_URL)).toBe(true);
  await page.getByRole("button", { name: "Undo", exact: true }).click(); await waitForDesignSave(page); expect(await elements(page)).toEqual(before);
  await selectLinkedElement(page, "text"); await page.getByRole("button", { name: "Lock", exact: true }).click(); await expect(page.getByRole("button", { name: "Link", exact: true })).toBeDisabled();
  await page.getByTestId("page").focus(); await page.keyboard.press("ControlOrMeta+k"); await expect(page.getByRole("dialog", { name: "Link", exact: true })).toHaveCount(0); expect((await elements(page))[0].link).toBeUndefined();
});

test("actual PDF downloads contain external actions and page destinations while SVG stays static", async ({ page }) => {
  await setWebsiteLink(page); await selectLinkedElement(page, "shape"); await pageLink(page); await selectLinkedElement(page, "image"); await setWebsiteLink(page);
  const original = await fileLibrary(page);
  for (const format of ["pdf_standard", "pdf_print"]) {
    const pdf = await PDFDocument.load(await download(page, format)), pages = pdf.getPages(), annotations = pages[0].node.Annots()!;
    expect(pages).toHaveLength(2); expect(annotations.size()).toBe(3);
    const action = annotations.lookup(0, PDFDict).lookup(PDFName.of("A"), PDFDict); expect(action.lookup(PDFName.of("URI"), PDFString).decodeText()).toBe(LINK_URL);
    expect(annotations.lookup(1, PDFDict).lookup(PDFName.of("Dest"), PDFArray).get(0)).toEqual(pages[1].ref);
    const subset = await PDFDocument.load(await download(page, format, true)); expect(subset.getPageCount()).toBe(1); expect(subset.getPages()[0].node.Annots()!.size()).toBe(2);
  }
  const svg = (await download(page, "svg", true)).toString("utf8"); expect(svg).toContain("Explore the details"); expect(svg).not.toContain("example.test"); expect(svg).not.toContain("Private link notes"); expect(await fileLibrary(page)).toEqual(original);
});

test("local backups remap page links in recovered copies and native clipboard keeps links on the same design", async ({ page }) => {
  await pageLink(page); await page.getByTestId("page").focus(); await page.keyboard.press("ControlOrMeta+c"); await page.keyboard.press("ControlOrMeta+v"); await waitForDesignSave(page);
  await expect.poll(async () => (await elements(page)).length).toBe(4); expect((await elements(page))[3].link).toEqual({ kind: "page", pageId: "link-details" });
  const before = await fileLibrary(page); await page.getByRole("link", { name: "Home", exact: true }).click(); const pending = page.waitForEvent("download"); await page.getByRole("button", { name: "Back up designs", exact: true }).click(); const file = await pending, bytes = await readFile((await file.path())!);
  expect(await readDesignBackup(new Blob([new Uint8Array(bytes)]))).toEqual(before);
  await page.getByLabel("Import design backup", { exact: true }).setInputFiles({ name: file.suggestedFilename(), mimeType: "application/x-canvaisdead-backup", buffer: bytes }); await expect(page.getByText(`${before.length} designs imported as new copies.`, { exact: true })).toBeVisible();
  const all = await fileLibrary(page), source = before.find(d => d.name === "Linked design")!, copy = all.find(d => d.name === "Linked design" && d.id !== source.id)!; expect(all.find(d => d.id === source.id)).toEqual(source);
  const pages = designPages(copy); expect(pages[0].els[0].link).toEqual({ kind: "page", pageId: pages[1].id }); expect(pages[0].els[3].link).toEqual(pages[0].els[0].link); expect(pages[1].id).not.toBe("link-details");
});

test("outside clicks commit valid links, Escape cancels edits and unavailable pages remain recoverable", async ({ page }) => {
  let dialog = await openElementLink(page); await dialog.getByRole("textbox").fill(LINK_URL); await page.getByRole("textbox", { name: "Design name", exact: true }).click(); await expect(dialog).toHaveCount(0); await waitForDesignSave(page); expect((await elements(page))[0].link).toEqual({ kind: "url", url: LINK_URL });
  dialog = await openElementLink(page); await dialog.getByRole("textbox").fill("https://example.test/cancel"); await page.keyboard.press("Escape"); expect((await elements(page))[0].link).toEqual({ kind: "url", url: LINK_URL });
  await pageLink(page); await page.getByRole("tab", { name: "Page 2: Details", exact: true }).click(); await page.getByRole("button", { name: "Delete page", exact: true }).click(); await selectLinkedElement(page, "text"); dialog = await openElementLink(page); await expect(dialog.getByRole("textbox")).toHaveValue("Page unavailable");
  await dialog.getByRole("button", { name: "Done", exact: true }).click(); await expect(dialog.getByRole("alert")).toContainText("no longer available"); await dialog.getByRole("button", { name: "Remove link", exact: true }).click(); await waitForDesignSave(page); expect((await elements(page))[0].link).toBeUndefined();
});
