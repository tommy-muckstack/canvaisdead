"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CanvasDesign } from "@/lib/design/types";
import { removeEls, type Measure } from "@/lib/design/ops";
import { canCutSelection, clipboardFormats, MAX_CLIPBOARD_BYTES, pasteElements, pasteImages, pasteText, richClipboard, selectionClipboard, type PastePoint, type PasteResult } from "@/lib/design/clipboard";
import { clipboardShortcutMessage, copySelectionToSystem, nativeClipboardTarget, readClipboardEvent, readSystemClipboard, writeClipboardEvent, type ClipboardInput } from "@/lib/design/clipboard-browser";

type Context = {
  design: CanvasDesign; pageId: string; ids: string[]; measure: Measure; blocked: () => boolean;
  importImage: (blob: Blob) => Promise<{ src: string; w: number; h: number }>;
  onPaste: (result: PasteResult) => void; onCut: (design: CanvasDesign) => void; message: (message: string) => void;
};
export function useElementClipboard(context: Context) {
  const latest = useRef(context), mounted = useRef(false), busyRef = useRef(false), [busy, setBusy] = useState(false);
  const repeated = useRef<{ key: string; step: number } | null>(null);
  const epoch = useRef(0);
  useLayoutEffect(() => { latest.current = context; });
  useLayoutEffect(() => { epoch.current++; }, [context.pageId, context.design.id]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const current = (snapshot: Context, started: number, cut = false) => mounted.current && epoch.current === started && !latest.current.blocked() && latest.current.design === snapshot.design && latest.current.pageId === snapshot.pageId && (!cut || JSON.stringify(latest.current.ids) === JSON.stringify(snapshot.ids));
  const report = (error: unknown) => { if (mounted.current) latest.current.message(error instanceof Error ? error.message : "Clipboard operation failed. Your design was not changed."); };
  function start() {
    if (latest.current.blocked()) return false;
    if (busyRef.current) { report(new Error("Wait for the current clipboard operation to finish.")); return false; }
    busyRef.current = true; setBusy(true); return true;
  }
  function finish() { busyRef.current = false; if (mounted.current) setBusy(false); }
  async function copy(cut = false) {
    if (!start()) return;
    const snapshot = latest.current, started = epoch.current;
    try {
      const result = await copySelectionToSystem({ design: snapshot.design, ids: snapshot.ids, pageId: snapshot.pageId, cut, isCurrent: () => current(snapshot, started, true), onCut: snapshot.onCut });
      if (mounted.current) latest.current.message(result === "copied-only" ? "Copied. The selection changed, so nothing was cut." : result === "cut" ? "Selection cut" : "Selection copied");
      repeated.current = null;
    } catch (error) { report(error); } finally { finish(); }
  }
  async function paste(input?: ClipboardInput, at?: PastePoint) {
    if (!start()) return;
    const snapshot = latest.current, started = epoch.current;
    try {
      const data = input ?? await readSystemClipboard(), packet = richClipboard(data);
      let result: PasteResult, repeat: { key: string; step: number } | null = null;
      if (packet) {
        const key = JSON.stringify([snapshot.design.id, snapshot.pageId, packet]);
        const step = repeated.current?.key === key ? repeated.current.step + 1 : packet.source.designId === snapshot.design.id && packet.source.pageId === snapshot.pageId ? 1 : 0;
        result = pasteElements(snapshot.design, packet, { step, at, measure: snapshot.measure }); repeat = { key, step };
      } else if (data.images.length) {
        if (data.images.reduce((total, blob) => total + blob.size, 0) > MAX_CLIPBOARD_BYTES) throw new Error("Paste images smaller than 50 MB in total.");
        const images = [];
        for (const blob of data.images) images.push(await snapshot.importImage(blob));
        result = pasteImages(snapshot.design, images, at);
      } else result = pasteText(snapshot.design, data.text ?? "", at, snapshot.measure);
      if (!current(snapshot, started)) throw new Error("The design changed while reading the clipboard. Paste again on the intended page.");
      snapshot.onPaste(result); repeated.current = repeat;
      latest.current.message(`Pasted ${result.ids.length} element${result.ids.length === 1 ? "" : "s"}`);
    } catch (error) { report(error); } finally { finish(); }
  }
  useEffect(() => {
    const allowed = (event: ClipboardEvent) => !event.defaultPrevented && !nativeClipboardTarget(event.target) && !latest.current.blocked();
    const copyEvent = (event: ClipboardEvent) => {
      if (!allowed(event) || window.getSelection()?.isCollapsed === false || !latest.current.ids.length) return;
      event.preventDefault();
      if (busyRef.current) { report(new Error("Wait for the current clipboard operation to finish.")); return; }
      const snapshot = latest.current, cut = event.type === "cut";
      try {
        if (!event.clipboardData) throw new Error(clipboardShortcutMessage);
        if (cut && !canCutSelection(snapshot.design, snapshot.ids)) throw new Error("Unlock the selected elements before cutting them.");
        writeClipboardEvent(event.clipboardData, clipboardFormats(selectionClipboard(snapshot.design, snapshot.ids, snapshot.pageId)));
        if (cut) snapshot.onCut(removeEls(snapshot.design, snapshot.ids));
        repeated.current = null; snapshot.message(cut ? "Selection cut" : "Selection copied");
      } catch (error) { report(error); }
    };
    const pasteEvent = (event: ClipboardEvent) => {
      if (!allowed(event)) return;
      event.preventDefault();
      try { if (!event.clipboardData) throw new Error(clipboardShortcutMessage); void paste(readClipboardEvent(event.clipboardData)); }
      catch (error) { report(error); }
    };
    window.addEventListener("copy", copyEvent); window.addEventListener("cut", copyEvent); window.addEventListener("paste", pasteEvent);
    return () => { window.removeEventListener("copy", copyEvent); window.removeEventListener("cut", copyEvent); window.removeEventListener("paste", pasteEvent); };
  });
  return { copy, paste: (at?: PastePoint) => paste(undefined, at), busy };
}
