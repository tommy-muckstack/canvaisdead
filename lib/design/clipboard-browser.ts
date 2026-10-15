import { canCutSelection, clipboardFormats, ELEMENT_CLIPBOARD_MIME, MAX_CLIPBOARD_BYTES, selectionClipboard, type ClipboardFormats } from "./clipboard";
import type { CanvasDesign } from "./types";
import { removeEls } from "./ops";

export type ClipboardInput = { json?: string; html?: string; text?: string; images: Blob[] };
const supportedImage = (type: string) => /^image\/(png|jpeg|webp|gif|avif)$/.test(type);
export const clipboardShortcutMessage = "Clipboard access is unavailable. Use Ctrl/Cmd+C, X or V on the canvas, or your browser’s paste command.";
export function readClipboardEvent(data: DataTransfer): ClipboardInput {
  return { json: data.getData(ELEMENT_CLIPBOARD_MIME), html: data.getData("text/html"), text: data.getData("text/plain"), images: Array.from(data.files).filter(file => supportedImage(file.type)) };
}
export function writeClipboardEvent(data: DataTransfer, formats: ClipboardFormats) {
  data.setData("text/plain", formats.text); data.setData("text/html", formats.html);
  // HTML is the standard rich fallback when a browser omits custom formats.
  try { data.setData(ELEMENT_CLIPBOARD_MIME, formats.json); } catch { /* Standard formats are already present. */ }
}
export async function writeSystemClipboard(formats: ClipboardFormats, clipboard: Pick<Clipboard, "write"> | undefined = globalThis.navigator?.clipboard, Item: typeof ClipboardItem | undefined = globalThis.ClipboardItem) {
  if (!clipboard?.write || !Item) throw new Error(clipboardShortcutMessage);
  try { await clipboard.write([new Item({ "text/plain": new Blob([formats.text], { type: "text/plain" }), "text/html": new Blob([formats.html], { type: "text/html" }) })]); }
  catch { throw new Error(clipboardShortcutMessage); }
}
export async function readSystemClipboard(clipboard: Pick<Clipboard, "read"> | undefined = globalThis.navigator?.clipboard): Promise<ClipboardInput> {
  if (!clipboard?.read) throw new Error(clipboardShortcutMessage);
  let items: ClipboardItems;
  try { items = await clipboard.read(); } catch { throw new Error(clipboardShortcutMessage); }
  const result: ClipboardInput = { images: [] }; let size = 0;
  for (const item of items) for (const type of item.types) {
    if (!["text/plain", "text/html", ELEMENT_CLIPBOARD_MIME].includes(type) && !supportedImage(type)) continue;
    if (supportedImage(type) && type !== item.types.find(supportedImage)) continue;
    const blob = await item.getType(type); size += blob.size;
    if (size > MAX_CLIPBOARD_BYTES * 2) throw new Error("Copy fewer elements. Clipboard artwork is limited to 50 MB.");
    if (supportedImage(type)) result.images.push(blob);
    else { const text = await blob.text(); if (type === "text/plain") result.text ??= text; else if (type === "text/html") result.html ??= text; else result.json ??= text; }
  }
  return result;
}
/** A failed/late write can never remove the source artwork. */
export async function copySelectionToSystem({ design, ids, pageId, cut, isCurrent, onCut, write = writeSystemClipboard }: {
  design: CanvasDesign; ids: string[]; pageId: string; cut: boolean; isCurrent: () => boolean;
  onCut: (design: CanvasDesign) => void; write?: (formats: ClipboardFormats) => Promise<void>;
}): Promise<"copied" | "cut" | "copied-only"> {
  if (cut && !canCutSelection(design, ids)) throw new Error("Unlock the selected elements before cutting them.");
  await write(clipboardFormats(selectionClipboard(design, ids, pageId)));
  if (!cut) return "copied";
  if (!isCurrent()) return "copied-only";
  onCut(removeEls(design, ids)); return "cut";
}
/** Native field, dialog and page-list operations retain their own clipboard. */
export function nativeClipboardTarget(target: EventTarget | null) {
  return target instanceof Element && !!target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), dialog, [role="dialog"], .cv-sharepop, .cv-page-list');
}
