"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BP } from "@/lib/basepath";
import { Ic } from "./Ic";
import { ArtworkElements, DesignArtwork } from "./Artwork";
import type { CanvasDesign, Design, El, ElType } from "@/lib/design/types";
import { FONTS, PALETTE, SIZES, addEl, approxMeasure, commit, elHeight, hist, hitTest, makeEl, patchEl, redo, removeEls, resizeElement, resizeCanvas, setElementLocked, touch, uid, undo, type Handle, type History, type Measure, type Rect } from "@/lib/design/ops";
import { duplicateSelection, elementsInMarquee, lockSelection, moveSelection, reorderSelection, resizeSelection, rotateSelection, selectedElements, selectionBounds, selectionOpacity, selectionRect, snapSelection } from "@/lib/design/selection";
import { canGroup, canUngroup, editableSelectionIds, expandGroupSelection, groupElements, groupMembers, groupParent, selectedGroup, toggleGroupSelection, ungroupElements } from "@/lib/design/groups";
import { PositionPanel } from "./PositionPanel";
import { canCutSelection, type PastePoint } from "@/lib/design/clipboard";
import { useElementClipboard } from "./useElementClipboard";
import { EditorContextMenu, type EditorMenuAction } from "./EditorContextMenu";
import { applyImageCrop } from "@/lib/design/image-crop";
import { useImageCrop } from "./useImageCrop";
import { ImageCropPanel } from "./ImageCropPanel";
import { ImageCropOverlay } from "./ImageCropOverlay";
import { TextSpacingPanel } from "./TextSpacingPanel";
import { TextEditor } from "./TextEditor";
import { ImageFlipMenu } from "./ImageFlipMenu";
import { flipImage } from "@/lib/design/image-flip";
import { TEMPLATES, fromTemplate } from "@/lib/design/templates";
import { canvasMeasure } from "@/lib/design/render";
import type { SaveState } from "@/lib/local-store";
import { SaveNotice } from "./SaveNotice";
import { addPage, deletePage, designPages, duplicatePage, editPage, MAX_PAGES, movePage, pageCanvas, resizeDesign, setPageNotes, titlePage } from "@/lib/design/pages";
import { PagesPanel } from "./PagesPanel";
import { templatesForCanvas } from "@/lib/design/template-search";
import { ELEMENT_DRAG_TYPE, EMPTY_ELEMENT_LIBRARY, insertElementAsset, isElementLibrary, rememberElement, starElement } from "@/lib/design/elements";
import { useLocal } from "@/lib/useLocal";
import { ElementsPanel, INITIAL_ELEMENTS_VIEW } from "./ElementsPanel";
import { UploadsPanel, type UploadView } from "./UploadsPanel";
import { useUploads } from "./useUploads";
import { imageDataURL, originalClipboardImage } from "@/lib/uploads/image";
import { insertUploadedImages, UPLOAD_DRAG_TYPE, type Upload } from "@/lib/uploads/model";

import { trackWebsite } from "@/lib/analytics/client";
import { DownloadPanel } from "./DownloadPanel";
import { BrandMark } from "../BrandMark";

const desktopEditor = () => window.matchMedia("(min-width: 701px)").matches;
const subscribeEditorWidth = (listener: () => void) => {
  const media = window.matchMedia("(min-width: 701px)"); media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
};

let _m: Measure | null = null;
const measure: Measure = (t, s, f, w, italic, spacing) => { if (typeof document === "undefined") return approxMeasure(t, s, f, w, italic, spacing); if (!_m) _m = canvasMeasure(document.createElement("canvas").getContext("2d")!); return _m(t, s, f, w, italic, spacing); };
const HANDLES: [Handle, number, number][] = [["nw", 0, 0], ["n", 0.5, 0], ["ne", 1, 0], ["e", 1, 0.5], ["se", 1, 1], ["s", 0.5, 1], ["sw", 0, 1], ["w", 0, 0.5]];
type DragBase = { pointerId: number; sx: number; sy: number; base: CanvasDesign; selectionBefore: string[]; scopeBefore: string | null; moved: boolean };
type Drag = DragBase & (
  { kind: "move"; ids: string[]; drill?: { scope: string; ids: string[] } } |
  { kind: "marquee"; additive: string[] } |
  { kind: "resize" | "rotate"; id: string; orig: El; handle?: Handle } |
  { kind: "multi-resize" | "multi-rotate"; ids: string[]; box: Rect; angle: number; handle?: Handle }
);

export function Editor({ uid: ownerId, initial, onSave, save, onBackup, guest = false }: { uid: string; initial: Design; onSave: (d: Design) => void; save: SaveState; onBackup: () => void; guest?: boolean }) {
  const [h, setH] = useState<History>(() => hist(initial));
  const [selectedPageId, setSelectedPageId] = useState(() => designPages(initial)[0].id);
  const [gridView, setGridView] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showPresent, setShowPresent] = useState(false);
  const router = useRouter();
  const wideEditor = useSyncExternalStore(subscribeEditorWidth, desktopEditor, () => true);
  const [panelOverride, setPanelOpen] = useState<boolean | null>(null);
  const panelOpen = panelOverride ?? wideEditor;
  const [templateQuery, setTemplateQuery] = useState("");
  const [elementsView, setElementsView] = useState(INITIAL_ELEMENTS_VIEW);
  const uploads = useUploads(ownerId), [uploadView, setUploadView] = useState<UploadView>({ query: "", tab: "Images" });
  const [insertingUpload, setInsertingUpload] = useState(false), [uploadInsertError, setUploadInsertError] = useState("");
  const uploadInsertQueue = useRef<Promise<void>>(Promise.resolve()), pendingUploadInserts = useRef(0);
  const [elementLibrary, setElementLibrary, elementLibraryReady, elementLibrarySave] = useLocal(ownerId, "element-library", EMPTY_ELEMENT_LIBRARY, isElementLibrary);
  const [draft, setDraft] = useState<CanvasDesign | null>(null);
  const [selection, setSelection] = useState<string[]>([]), [multiSelect, setMultiSelect] = useState(false);
  const [groupScope, setGroupScope] = useState<string | null>(null);
  const [marquee, setMarquee] = useState<Rect | null>(null);
  const setSel = (id: string | null) => setSelection(id ? [id] : []);
  const [pop, setPop] = useState<null | "color" | "trans" | "spacing">(null);
  const [positionOpen, setPositionOpen] = useState(false), positionButton = useRef<HTMLButtonElement>(null);
  const spacingButton = useRef<HTMLButtonElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; point?: PastePoint } | null>(null);
  const contextMenuTrigger = useRef<HTMLElement | SVGSVGElement | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [cropping, setCropping] = useState<El | null>(null);
  const [tab, setTab] = useState<"templates" | "elements" | "text" | "uploads" | "background">("templates");
  const [zoom, setZoom] = useState(1); const [fit, setFit] = useState(0.5);
  const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
  const [msg, setMsg] = useState(""); const [showSize, setShowSize] = useState(false); const [showExport, setShowExport] = useState(false); const [showShare, setShowShare] = useState(false);
  const shareButton = useRef<HTMLButtonElement>(null);
  const closeShare = () => { setShowShare(false); setShowExport(false); shareButton.current?.focus(); };
  const wrap = useRef<HTMLDivElement>(null); const svgRef = useRef<SVGSVGElement>(null); const drag = useRef<Drag | null>(null);
  const draftValue = useRef<CanvasDesign | null>(null), captureTarget = useRef<Element | null>(null);
  const pages = useMemo(() => designPages(h.present), [h.present]);
  const pageIndex = Math.max(0, pages.findIndex(page => page.id === selectedPageId));
  const activePage = pages[pageIndex];
  const current = useMemo(() => pageCanvas(h.present, activePage.id), [h.present, activePage.id]);
  const uploadContext = useRef({ pageId: activePage.id, design: current, alive: true, blocked: false });
  useLayoutEffect(() => { uploadContext.current = { pageId: activePage.id, design: current, alive: true, blocked: !!cropping || !!editing || gridView }; return () => { uploadContext.current.alive = false; }; });
  const templates = useMemo(() => templatesForCanvas(TEMPLATES, current.w, current.h, templateQuery).map(template => ({ template, preview: fromTemplate(template) })), [current.w, current.h, templateQuery]);
  const designKind = SIZES.find(size => size.w === current.w && size.h === current.h)?.label ?? "design";
  const crop = useImageCrop(cropping);
  const cropPreview = crop.preview;
  const d = useMemo(() => cropPreview ? { ...current, els: current.els.map(e => e.id === cropPreview.id ? cropPreview : e) } : draft ?? current, [cropPreview, current, draft]); const scale = fit * zoom;
  const selected = selectedElements(d, selection), selectedIds = selected.map(element => element.id);
  const selEl = selected.length === 1 ? selected[0] : null, sel = selEl?.id ?? null;
  const multi = selected.length > 1, bounds = selectionBounds(selected, measure);
  const scope = groupScope && groupMembers(d.els, groupScope).length ? groupScope : null;
  const selectedGroupId = selectedGroup(d.els, selectedIds);
  const groupable = canGroup(d.els, selectedIds, scope), ungroupable = canUngroup(d.els, selectedIds, scope);
  const hasUnlocked = editableSelectionIds(d.els, selectedIds).length > 0, allLocked = selected.length > 0 && selected.every(element => element.locked);
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 1800); };

  useEffect(() => { setPop(null); }, [selection]);
  const apply = useCallback((update: CanvasDesign | ((page: CanvasDesign) => CanvasDesign)) => {
    setH(previous => commit(previous, editPage(previous.present, activePage.id, page => typeof update === "function" ? update(page) : update)));
  }, [activePage.id]);
  const applyDocument = (update: (design: Design) => Design) => setH(previous => commit(previous, update(previous.present)));
  const clearDrag = useCallback(() => {
    const pointer = drag.current?.pointerId; drag.current = null; draftValue.current = null;
    if (pointer !== undefined && captureTarget.current?.hasPointerCapture(pointer)) captureTarget.current.releasePointerCapture(pointer);
    captureTarget.current = null; setDraft(null); setMarquee(null); setGuides({ x: [], y: [] });
  }, []);
  const cancelDrag = useCallback(() => { if (drag.current) { setSelection(drag.current.selectionBefore); setGroupScope(drag.current.scopeBefore); clearDrag(); } }, [clearDrag]);
  useEffect(() => { window.addEventListener("blur", cancelDrag); return () => window.removeEventListener("blur", cancelDrag); }, [cancelDrag]);
  const clearInteraction = () => { clearDrag(); setSel(null); setGroupScope(null); setMultiSelect(false); setEditing(null); setCropping(null); setContextMenu(null); setPop(null); setPositionOpen(false); };
  const selectPage = (id: string) => { clearInteraction(); setSelectedPageId(id); };
  const newPage = () => {
    if (pages.length >= MAX_PAGES) { flash(`Designs can have up to ${MAX_PAGES} pages`); return; }
    const id = uid("p"); applyDocument(design => addPage(design, activePage.id, id)); selectPage(id);
  };
  const copyPage = () => {
    if (pages.length >= MAX_PAGES) { flash(`Designs can have up to ${MAX_PAGES} pages`); return; }
    const id = uid("p"); applyDocument(design => duplicatePage(design, activePage.id, id)); selectPage(id);
  };
  const removePage = () => {
    if (pages.length === 1) return;
    applyDocument(design => deletePage(design, activePage.id));
    selectPage(pages[pageIndex + 1]?.id ?? pages[pageIndex - 1].id);
  };
  const reorderPage = (id: string, index: number) => { applyDocument(design => movePage(design, id, index)); selectPage(id); };
  const travelHistory = (back: boolean) => { clearInteraction(); setH(previous => back ? undo(previous) : redo(previous)); };
  // Persist committed edits before the browser can paint or navigate away.
  useLayoutEffect(() => { onSave(h.present); }, [h.present, onSave]);
  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const ro = new ResizeObserver(() => {
      const style = getComputedStyle(el);
      const horizontal = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const vertical = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      setFit(Math.max(0.01, Math.min((el.clientWidth - horizontal) / current.w, (el.clientHeight - vertical) / current.h)));
    });
    ro.observe(el); return () => ro.disconnect();
  }, [current.w, current.h]);

  const add = (type: ElType, over: Partial<El> = {}) => { const e = makeEl(type, current, type === "text" ? { lineHeight: 1.4, ...over } : over); apply(latest => addEl(latest, e)); setSel(e.id); setGroupScope(null); setMultiSelect(false); if (!wideEditor) setPanelOpen(false); };
  const addFromElements = (id: string, point?: { x: number; y: number }) => {
    const result = insertElementAsset(current, id, point); if (!result.ids.length) return;
    apply(result.design); setSelection(result.ids); setGroupScope(null); setMultiSelect(false); setEditing(null); setContextMenu(null);
    setElementLibrary(previous => rememberElement(previous, id)); if (!wideEditor) setPanelOpen(false);
    if (!wideEditor || point) requestAnimationFrame(() => svgRef.current?.focus({ preventScroll: true }));
  };
  const chooseUploads = (items: Upload[], point?: { x: number; y: number }, origin = { pageId: activePage.id, designId: current.id, w: current.w, h: current.h }) => {
    if (!items.length || !uploadContext.current.alive) return Promise.resolve();
    pendingUploadInserts.current++; setInsertingUpload(true); setUploadInsertError("");
    // Preserve every accepted drop while earlier originals are still being read.
    const next = uploadInsertQueue.current.then(async () => {
      if (!uploadContext.current.alive) return;
      const images = [];
      for (const item of items) images.push({ src: await imageDataURL(item.original), w: item.width, h: item.height });
      const context = uploadContext.current;
      if (!context.alive) return;
      if (context.pageId !== origin.pageId || context.design.id !== origin.designId) { setUploadInsertError("The page changed while reading the file. Choose the image again on this page."); return; }
      if (drag.current || context.blocked) { setUploadInsertError("Finish the current edit, then choose the image again. It remains in your upload library."); return; }
      if (point && (context.design.w !== origin.w || context.design.h !== origin.h)) { setUploadInsertError("The page size changed while reading the file. Choose the image again to place it on this page."); return; }
      if (items.some(item => !uploads.store.getSnapshot().assets.some(latest => latest.id === item.id && latest.trashedAt === undefined))) { setUploadInsertError("An upload was removed while reading it. Restore it or choose another file."); return; }
      const result = insertUploadedImages(context.design, images, point), added = result.design.els.filter(element => result.ids.includes(element.id));
      apply(latest => touch({ ...latest, els: [...latest.els, ...added] }));
      setSelection(result.ids); setGroupScope(null); setMultiSelect(false); setEditing(null); setContextMenu(null);
      if (!wideEditor) setPanelOpen(false); requestAnimationFrame(() => svgRef.current?.focus({ preventScroll: true }));
    }).catch(error => { if (uploadContext.current.alive) setUploadInsertError(error instanceof Error ? error.message : "This image could not be added. Try again."); }).finally(() => {
      pendingUploadInserts.current--; if (uploadContext.current.alive && pendingUploadInserts.current === 0) setInsertingUpload(false);
    });
    uploadInsertQueue.current = next; return next;
  };
  const canvasDropPoint = (event: React.DragEvent) => {
    if (cropping || editing || gridView || drag.current) return null;
    const box = svgRef.current?.getBoundingClientRect();
    if (!box || box.width <= 0 || box.height <= 0 || event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) return null;
    return { x: (event.clientX - box.left) / box.width * current.w, y: (event.clientY - box.top) / box.height * current.h };
  };
  const acceptsDrop = (event: React.DragEvent) => [ELEMENT_DRAG_TYPE, UPLOAD_DRAG_TYPE, "Files"].some(type => event.dataTransfer.types.includes(type));
  const dropOnCanvas = (event: React.DragEvent) => {
    const point = canvasDropPoint(event); if (!point || !acceptsDrop(event)) return; event.preventDefault();
    if (event.dataTransfer.files.length) {
      const files = Array.from(event.dataTransfer.files), origin = { pageId: activePage.id, designId: current.id, w: current.w, h: current.h };
      setTab("uploads"); setPositionOpen(false); setPanelOpen(true); setUploadView({ query: "", tab: "Images" });
      void uploads.store.enqueue(files).then(items => { if (uploadContext.current.alive) return chooseUploads(items, point, origin); });
    } else if (event.dataTransfer.types.includes(UPLOAD_DRAG_TYPE)) {
      const item = uploads.assets.find(item => item.id === event.dataTransfer.getData(UPLOAD_DRAG_TYPE) && item.trashedAt === undefined);
      if (item) void chooseUploads([item], point);
    } else addFromElements(event.dataTransfer.getData(ELEMENT_DRAG_TYPE), point);
  };
  const edit = (p: Partial<El>) => { if (sel) apply(latest => patchEl(latest, sel, p, measure)); };
  const del = () => { if (hasUnlocked) { const removed = new Set(editableSelectionIds(current.els, selectedIds)); apply(latest => removeEls(latest, selectedIds)); setSelection(selectedIds.filter(id => !removed.has(id))); } };
  const dup = () => { if (selectedIds.length) { const result = duplicateSelection(current, selectedIds); apply(result.design); setSelection(result.ids); } };
  const selectAll = () => { setSelection(expandGroupSelection(current.els, current.els.map(e => e.id), null, true)); setGroupScope(null); setEditing(null); };
  const group = () => { if (groupable) { apply(latest => groupElements(latest, selectedIds, scope)); setMultiSelect(false); } };
  const ungroup = () => { if (ungroupable) { apply(latest => ungroupElements(latest, selectedIds, scope)); if (!selectedGroupId && scope) setGroupScope(groupParent(current.els, scope)); } };
  const selectParent = () => { if (scope) { setSelection(groupMembers(current.els, scope)); setGroupScope(groupParent(current.els, scope)); setEditing(null); } };
  const togglePosition = () => { const open = !positionOpen || !panelOpen; setPositionOpen(open); setPop(null); if (open) setPanelOpen(true); };
  const closePosition = () => { setPositionOpen(false); if (!wideEditor) setPanelOpen(false); (positionButton.current ?? svgRef.current)?.focus({ preventScroll: true }); };
  const selectLayer = (ids: string[], nextScope: string | null, additive: boolean, replace = false) => {
    setEditing(null);
    if (replace || (!additive && !multiSelect)) { setGroupScope(nextScope); setSelection(ids); return; }
    const targetScope = scope === nextScope ? scope : null;
    const previous = expandGroupSelection(current.els, selectedIds, targetScope), next = expandGroupSelection(current.els, ids, targetScope), remove = next.every(id => previous.includes(id));
    setGroupScope(targetScope); setSelection(remove ? previous.filter(id => !next.includes(id)) : [...new Set([...previous, ...next])]);
  };
  const startCrop = (element: El) => { if (element.type !== "image" || element.locked) return; clearDrag(); setCropping(element); setSel(element.id); setGroupScope(element.groupPath?.at(-1) ?? null); setMultiSelect(false); setEditing(null); setPop(null); setPositionOpen(false); setContextMenu(null); setPanelOpen(true); };
  const finishCrop = (saveCrop: boolean) => { if (saveCrop && cropping && crop.preview && crop.changed) apply(latest => applyImageCrop(latest, cropping, crop.preview!)); setCropping(null); if (!wideEditor) setPanelOpen(false); svgRef.current?.focus({ preventScroll: true }); };
  useEffect(() => {
    if (!cropping) return;
    const outside = (event: PointerEvent) => { if (event.target instanceof Element && !event.target.closest('.cv-crop-panel, .cv-crop-overlay, .cv-ctx, .cv-panel-toggle, [data-testid="page"]')) finishCrop(true); };
    window.addEventListener("pointerdown", outside, true); return () => window.removeEventListener("pointerdown", outside, true);
  });
  const clipboard = useElementClipboard({ design: current, pageId: activePage.id, ids: selectedIds, measure, blocked: () => !!editing || !!cropping || gridView || !!drag.current || showShare,
    importImage: originalClipboardImage, message: flash,
    onPaste: result => { apply(result.design); setSelection(result.ids); setGroupScope(null); setMultiSelect(false); setContextMenu(null); if (!wideEditor) setPanelOpen(false); },
    onCut: design => { apply(design); setSel(null); setGroupScope(null); setContextMenu(null); },
  });
  const closeContextMenu = (restoreFocus = true) => {
    setContextMenu(null); if (!restoreFocus) return;
    const trigger = contextMenuTrigger.current; (trigger?.isConnected ? trigger : svgRef.current)?.focus({ preventScroll: true });
    requestAnimationFrame(() => { if (trigger && !trigger.isConnected && document.activeElement === document.body) svgRef.current?.focus({ preventScroll: true }); });
  };
  const openActions = (event: React.MouseEvent<HTMLButtonElement>) => { contextMenuTrigger.current = event.currentTarget; const box = event.currentTarget.getBoundingClientRect(); setContextMenu({ x: box.left, y: box.bottom }); };
  const openLayerActions = (ids: string[], nextScope: string | null, trigger: HTMLButtonElement, point?: { x: number; y: number }) => {
    const sameSelection = ids.length === selectedIds.length && ids.every(id => selectedIds.includes(id));
    selectLayer(ids, sameSelection ? scope : nextScope, false, true); contextMenuTrigger.current = trigger;
    const box = trigger.getBoundingClientRect(); setContextMenu(point ?? { x: box.left, y: box.bottom });
  };
  const menuActions: EditorMenuAction[] = [
    { label: "Copy", shortcut: "Ctrl/Cmd+C", disabled: !selectedIds.length || clipboard.busy, run: () => { void clipboard.copy(); } },
    { label: "Cut", shortcut: "Ctrl/Cmd+X", disabled: !canCutSelection(current, selectedIds) || clipboard.busy, run: () => { void clipboard.copy(true); } },
    { label: "Paste", shortcut: "Ctrl/Cmd+V", disabled: clipboard.busy, run: () => { void clipboard.paste(contextMenu?.point); } },
    { label: "Duplicate", shortcut: "Ctrl/Cmd+D", divider: true, disabled: !selectedIds.length, run: dup },
    { label: "Delete", shortcut: "Delete", disabled: !hasUnlocked, run: del },
    ...(selEl?.type === "image" ? [{ label: "Crop", disabled: !!selEl.locked, run: () => startCrop(selEl) }] : []),
    ...(groupable ? [{ label: "Group", shortcut: "Ctrl/Cmd+G", run: group }] : []),
    ...(ungroupable ? [{ label: "Ungroup", shortcut: "Ctrl/Cmd+Shift+G", run: ungroup }] : []),
    { label: allLocked ? "Unlock" : "Lock", disabled: !selectedIds.length, run: () => apply(latest => lockSelection(latest, selectedIds, !allLocked)) },
    ...([['Bring forward', 'forward'], ['Send backward', 'backward'], ['Bring to front', 'front'], ['Send to back', 'back']] as const).map(([label, direction], i) => ({ label, divider: i === 0, disabled: !hasUnlocked, run: () => apply(latest => reorderSelection(latest, selectedIds, direction)) })),
    { label: "Position", run: () => { setPositionOpen(true); setPanelOpen(true); setPop(null); } },
    { label: multiSelect ? "Done selecting" : "Select multiple", run: () => setMultiSelect(value => !value) },
    { label: "Select all", shortcut: "Ctrl/Cmd+A", divider: true, run: selectAll },
  ];

  // keyboard
  useEffect(() => {
    const k = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement; if (ev.defaultPrevented || (t && (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable || t.closest('.cv-sharepop, .cv-page-list, dialog, [role="dialog"], [role="menu"]')))) return; const mod = ev.metaKey || ev.ctrlKey;
      if (!mod && ev.key.startsWith("Arrow") && t?.closest(".cv-position-panel")) return;
      if (cropping) {
        // Enter activates the focused button; it must not turn Cancel/Reset into Done.
        if (ev.key === "Enter" && t?.closest("button, a[href], summary")) return;
        if (ev.key === "Escape" || ev.key === "Enter") { ev.preventDefault(); finishCrop(ev.key === "Enter" && !!crop.preview); }
        else if (mod && ["z", "y", "d", "a", "g"].includes(ev.key.toLowerCase())) ev.preventDefault();
        return;
      }
      if (drag.current) { if (ev.key === "Escape") { ev.preventDefault(); cancelDrag(); } return; }
      if (ev.key === "ContextMenu" || (ev.shiftKey && ev.key === "F10")) { ev.preventDefault(); contextMenuTrigger.current = svgRef.current; const box = svgRef.current?.getBoundingClientRect(); if (box && !gridView) setContextMenu({ x: box.left + box.width / 2, y: box.top + box.height / 2 }); }
      else if (mod && ev.key.toLowerCase() === "z") { ev.preventDefault(); travelHistory(!ev.shiftKey); }
      else if (mod && ev.key.toLowerCase() === "y") { ev.preventDefault(); travelHistory(false); }
      else if (mod && ev.key === "Enter") { ev.preventDefault(); newPage(); }
      else if (mod && ev.key.toLowerCase() === "a") { ev.preventDefault(); selectAll(); }
      else if (mod && ev.key.toLowerCase() === "g") { ev.preventDefault(); if (ev.shiftKey) ungroup(); else group(); }
      else if (ev.key === "F8" && selectedIds.length) { ev.preventDefault(); setMultiSelect(value => !value); }
      else if (mod && ev.key.toLowerCase() === "d") { ev.preventDefault(); if (selectedIds.length) dup(); else copyPage(); }
      else if ((ev.key === "Delete" || ev.key === "Backspace") && selectedIds.length) { ev.preventDefault(); del(); }
      else if (ev.key === "Escape") { if (scope) selectParent(); else clearInteraction(); setPop(null); }
      else if (selectedIds.length && ev.key.startsWith("Arrow") && !mod) { ev.preventDefault(); const step = ev.shiftKey ? 10 : 1; apply(latest => moveSelection(latest, selectedIds, ev.key === "ArrowRight" ? step : ev.key === "ArrowLeft" ? -step : 0, ev.key === "ArrowDown" ? step : ev.key === "ArrowUp" ? -step : 0)); }
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }); // re-bind each render so closures are fresh

  const toDesign = (ev: React.PointerEvent) => { const r = svgRef.current!.getBoundingClientRect(); return { x: (ev.clientX - r.left) / scale, y: (ev.clientY - r.top) / scale }; };
  const capture = (ev: React.PointerEvent) => { captureTarget.current = ev.currentTarget; ev.currentTarget.setPointerCapture(ev.pointerId); };
  const down = (ev: React.PointerEvent, outside = false) => {
    if (editing || gridView || ev.button !== 0 || !ev.isPrimary || drag.current) return;
    if (cropping) { finishCrop(true); return; }
    const p = toDesign(ev), hit = outside ? null : hitTest(current, p.x, p.y, measure, true);
    svgRef.current?.focus({ preventScroll: true }); window.getSelection()?.removeAllRanges();
    const hitScope = hit && scope && hit.groupPath?.includes(scope) ? scope : null;
    if (hit && (ev.shiftKey || multiSelect)) { setGroupScope(hitScope); setSelection(toggleGroupSelection(current.els, hitScope === scope ? selectedIds : expandGroupSelection(current.els, selectedIds, hitScope), hit.id, hitScope)); return; }
    if (!hit && multiSelect && ev.pointerType === "touch") return;
    const base: DragBase = { pointerId: ev.pointerId, sx: p.x, sy: p.y, base: current, selectionBefore: selectedIds, scopeBefore: scope, moved: false };
    if (hit) {
      const ids = selectedIds.includes(hit.id) ? selectedIds : expandGroupSelection(current.els, [hit.id], hitScope);
      const drill = selectedGroupId && selectedIds.includes(hit.id) ? { scope: selectedGroupId, ids: expandGroupSelection(current.els, [hit.id], selectedGroupId) } : undefined;
      setGroupScope(hitScope); setSelection(ids); drag.current = { ...base, kind: "move", ids, drill };
    } else {
      const additive = ev.shiftKey ? expandGroupSelection(current.els, selectedIds, null, true) : [];
      setGroupScope(null); setSelection(additive); drag.current = { ...base, kind: "marquee", additive };
    }
    capture(ev);
  };
  const startHandle = (ev: React.PointerEvent, kind: "resize" | "rotate", handle?: Handle) => {
    ev.stopPropagation(); if (!selEl || selEl.locked || ev.button !== 0 || !ev.isPrimary || drag.current) return;
    const p = toDesign(ev); capture(ev);
    drag.current = { kind, id: selEl.id, sx: p.x, sy: p.y, orig: { ...selEl, h: elHeight(selEl, measure) }, handle, base: current, selectionBefore: selectedIds, scopeBefore: scope, pointerId: ev.pointerId, moved: false };
  };
  const startMultiHandle = (ev: React.PointerEvent, kind: "multi-resize" | "multi-rotate", handle?: Handle) => {
    ev.stopPropagation(); if (!multi || !bounds || selected.some(element => element.locked) || ev.button !== 0 || !ev.isPrimary || drag.current) return;
    const p = toDesign(ev); capture(ev);
    drag.current = { kind, ids: selectedIds, box: bounds, sx: p.x, sy: p.y, angle: Math.atan2(p.y - bounds.y - bounds.h / 2, p.x - bounds.x - bounds.w / 2), handle, base: current, selectionBefore: selectedIds, scopeBefore: scope, pointerId: ev.pointerId, moved: false };
  };
  const preview = (next: CanvasDesign) => { draftValue.current = next; setDraft(next); };
  const move = (ev: React.PointerEvent) => {
    const g = drag.current; if (!g || g.pointerId !== ev.pointerId) return;
    const p = toDesign(ev), dx = p.x - g.sx, dy = p.y - g.sy;
    if (!g.moved && Math.hypot(dx, dy) * scale < 3) return;
    g.moved = true;
    if (g.kind === "marquee") {
      const box = selectionRect({ x: g.sx, y: g.sy }, p); setMarquee(box);
      setSelection([...new Set([...g.additive, ...expandGroupSelection(g.base.els, elementsInMarquee(g.base, box, measure), null, true)])]);
    } else if (g.kind === "move") {
      const snapped = ev.altKey ? { dx, dy, guides: { x: [], y: [] } } : snapSelection(g.base, g.ids, dx, dy, 6 / Math.max(scale, 0.2), measure);
      setGuides(snapped.guides); preview(moveSelection(g.base, g.ids, snapped.dx, snapped.dy));
    } else if (g.kind === "multi-resize") preview(resizeSelection(g.base, g.ids, g.handle!, dx, dy, measure));
    else if (g.kind === "multi-rotate") {
      const angle = Math.atan2(p.y - g.box.y - g.box.h / 2, p.x - g.box.x - g.box.w / 2);
      const degrees = (angle - g.angle) * 180 / Math.PI;
      preview(rotateSelection(g.base, g.ids, ev.altKey ? degrees : Math.round(degrees / 15) * 15, measure));
    } else if (g.kind === "resize") preview(patchEl(g.base, g.id, resizeElement(g.orig, g.handle!, dx, dy, ev.shiftKey || g.orig.type === "image", measure)));
    else if (g.kind === "rotate") {
      const o = g.orig, hh = elHeight(o, measure), cx = o.x + o.w / 2, cy = o.y + hh / 2;
      let angle = Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI - 90;
      if (!ev.altKey) angle = Math.round(angle / 15) * 15;
      preview(patchEl(g.base, g.id, { rotation: Math.round(angle) }));
    }
  };
  const up = (ev: React.PointerEvent) => {
    if (!drag.current || drag.current.pointerId !== ev.pointerId) return;
    move(ev); const next = draftValue.current, gesture = drag.current;
    if (next && next !== drag.current.base) apply(next);
    if (!gesture.moved && gesture.kind === "move" && gesture.drill) { setGroupScope(gesture.drill.scope); setSelection(gesture.drill.ids); }
    clearDrag();
  };

  const startPresentation = (mode: "standard" | "presenter" | "autoplay") => {
    if (save.status !== "saved") { flash("Save this design before presenting in another view."); return; }
    const session = crypto.randomUUID(), path = `/app/design/${encodeURIComponent(current.id)}/present`;
    if (mode === "presenter") {
      const audience = window.open(`${BP}${path}?mode=audience&session=${session}&page=${pageIndex + 1}`, `canvaisdead-audience-${session}`);
      if (!audience) { flash("Allow pop-ups to open the audience window."); return; }
    } else if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      void document.documentElement.requestFullscreen().catch(() => {});
    }
    router.push(`${path}?mode=${mode}&session=${session}&page=${pageIndex + 1}`);
  };
  const textEl = editing ? d.els.find(e => e.id === editing) : null;
  const selH = selEl ? elHeight(selEl, measure) : 0;
  const swatch = (c: string, cur: string | undefined, on: (c: string) => void) => <button key={c} aria-label={`Color ${c}`} className="cv-sw" style={{ background: c, outline: cur?.toLowerCase() === c.toLowerCase() ? "2px solid var(--ids-color-primary)" : undefined }} onClick={() => on(c)} />;

  return <div className={"cv" + (panelOpen ? "" : " cv-panel-collapsed") + (cropping ? " cv-cropping" : "") + (positionOpen ? " cv-positioning" : "")}>
    <div className="cv-top">
      <Link className="cv-tb" href="/app" aria-label="Home"><Ic n="home" s={20} /></Link>
      <button className="cv-tb t">File</button>
      <div style={{ position: "relative" }}><button className="cv-tb t" onClick={() => setShowSize(s => !s)}>Resize</button>
        {showSize && <div className="cv-pop">{SIZES.map(s => <button key={s.id} className="cv-pop__i" onClick={() => { applyDocument(design => resizeDesign(design, s.w, s.h)); setShowSize(false); }}>{s.label}<small>{s.hint}</small></button>)}</div>}</div>
      <button className="cv-tb t cv-editmode"><Ic n="edit" s={16} /> Editing <Ic n="chev" s={14} /></button>
      <button className="cv-tb" onClick={() => travelHistory(true)} disabled={!h.past.length} aria-label="Undo"><Ic n="undo" s={18} /></button>
      <button className="cv-tb" onClick={() => travelHistory(false)} disabled={!h.future.length} aria-label="Redo"><Ic n="redo" s={18} /></button>
      <span className="cv-tb cv-save-state" role="status" aria-label={save.status === "saved" ? "Saved in this browser only" : save.status === "saving" ? "Saving in this browser…" : "Changes have not been saved"} title={save.status === "saved" ? "Saved in this browser only" : save.status === "saving" ? "Saving in this browser…" : "Changes have not been saved"}><Ic n={save.status === "saved" ? "saved" : "unsaved"} s={20} /></span>
      <input aria-label="Design name" className="cv-name" value={current.name} onChange={event => { const name = event.currentTarget.value; setH(previous => ({ ...previous, present: touch({ ...previous.present, name }) })); }} />
      <span className="cv-try">Everything included</span>{guest ? <Link className="cv-guest-signin" href={`/login?callbackUrl=${encodeURIComponent(`/app/design/${encodeURIComponent(current.id)}`)}`} title="Guest · designs saved in this browser">Sign in</Link> : <span className="cv-tkav">TK</span>}
      <button className="cv-tb" aria-label="Insights"><Ic n="chart" s={20} /></button><button className="cv-tb" aria-label="Comments"><Ic n="comment" s={20} /></button>
      <span className="cv-split cv-present-menu"><button className="cv-pres" onClick={() => startPresentation("standard")}>Present</button><button className="cv-pres sm" aria-label="More present options" aria-expanded={showPresent} onClick={() => setShowPresent(value => !value)}><Ic n="chev" s={14} /></button>
        {showPresent && <div className="cv-pop" role="group" aria-label="Presentation modes">
          <button className="cv-pop__i" onClick={() => startPresentation("standard")}>Present full screen</button>
          <button className="cv-pop__i" onClick={() => startPresentation("presenter")}>Presenter view</button>
          <button className="cv-pop__i" onClick={() => startPresentation("autoplay")}>Autoplay</button>
          <button className="cv-pop__i" onClick={() => setShowPresent(false)}>Close</button>
        </div>}
      </span>
      <div style={{ position: "relative" }}><button ref={shareButton} className="cv-share" aria-expanded={showShare} onClick={() => { setShowShare(s => !s); setShowExport(false); }}>Share</button>
        {showShare && <div className="cv-sharepop" role="dialog" aria-label={showExport ? "Download design" : "Share design"}>
          {!showExport ? <><div className="hd"><b>Share design</b><span><Ic n="chart" s={14} /> 0 visitors</span><Ic n="gear" s={16} /></div>
            <small className="lb">People with access</small><div className="add"><span>Add people</span><i>TK</i><i className="p">+</i></div>
            <div className="acc"><Ic n="lock" s={16} /> Only you can access <Ic n="chev" s={14} /></div>
            <div className="cp"><button className="cv-purple" onClick={() => { navigator.clipboard?.writeText(location.href); flash("Link copied"); }}>Copy link</button><button className="pl"><Ic n="crown" s={14} /> Personalize your link</button></div>
            <div className="ig">{([["dl", "Download", () => setShowExport(true)], ["present", "Present", () => startPresentation("standard")], ["link", "Public view link"], ["present", "Present and record"], ["globe", "Website"], ["apps", "Microsoft PowerPoint"], ["folder", "Google Drive"], ["more", "See all"]] as [string, string, (() => void)?][]).map(([i, l, f]) => <button key={l} onClick={f}><span><Ic n={i} s={20} /></span>{l}</button>)}</div></>
          : <DownloadPanel design={h.present} currentPageId={activePage.id} onBack={() => { setShowExport(false); requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(".cv-sharepop .ig button")?.focus()); }} onClose={closeShare} />}
        </div>}</div>
    </div>
    <SaveNotice save={save} onBackup={onBackup} />
    <div className={"cv-ctx" + (multi ? " cv-multi-tools" : "")} aria-label="Element toolbar">
      {cropping && <><b className="cv-selection-count">Crop image</b><button type="button" className="cx tx" onClick={() => finishCrop(false)}>Cancel crop</button><button type="button" className="cx tx" disabled={!crop.preview || !!crop.error} onClick={() => finishCrop(true)}>Done cropping</button></>}
      {!cropping && multi && <>
        <span role="status" className="cv-selection-count">{selectedGroupId ? "Group · " : ""}{selected.length} selected{selected.some(element => element.locked) ? " · includes locked" : ""}</span>
        <button className="cx" aria-label="Duplicate selection" onClick={dup}><Ic n="copy" s={18} /></button>
        <button className="cx" aria-label="Delete selection" disabled={!hasUnlocked} onClick={del}><Ic n="trash" s={18} /></button>
        <button className="cx" aria-label={allLocked ? "Unlock selection" : "Lock selection"} aria-pressed={allLocked} onClick={() => apply(latest => lockSelection(latest, selectedIds, !allLocked))}><Ic n="lock" s={18} /></button>
        <button className="cx" aria-label="More selection actions" aria-haspopup="menu" onClick={openActions}><Ic n="more" s={18} /></button>
        <span className="rel"><button className="cx tx" disabled={!hasUnlocked} aria-expanded={pop === "trans"} onClick={() => setPop(value => value === "trans" ? null : "trans")}>Transparency</button>
          {pop === "trans" && <div className="cv-pop tp"><label className="cv-lbl">Opacity{selected.some(element => element.opacity !== selected[0].opacity) && <span>Mixed</span>}<input type="range" aria-label="Selection opacity" min={0} max={100} value={Math.round(selected[0].opacity * 100)} onChange={event => { const opacity = +event.target.value / 100; apply(latest => selectionOpacity(latest, selectedIds, opacity)); }} /></label></div>}
        </span>
      </>}
      {!cropping && selEl && !selEl.locked && <>
        {selEl.type === "image" && <><button type="button" className="cx tx" onClick={() => startCrop(selEl)}>Crop</button>{selEl.src && <ImageFlipMenu key={selEl.id} element={selEl} onOpen={() => setPop(null)} onFlip={axis => apply(latest => flipImage(latest, selEl.id, axis))} />}</>}
        {selEl.type === "text" && <>
          <select aria-label="Font" className="cv-sel" value={selEl.fontFamily} onChange={e => edit({ fontFamily: e.target.value })}>{FONTS.map(f => <option key={f.label} value={f.css}>{f.label}</option>)}</select>
          <span className="cv-step"><button aria-label="Decrease font size" onClick={() => edit({ fontSize: Math.max(8, Math.round(selEl.fontSize ?? 32) - 2) })}>−</button><input aria-label="Font size" className="cv-num" type="number" min={8} max={600} value={Math.round(selEl.fontSize ?? 32)} onChange={e => edit({ fontSize: +e.target.value || 8 })} /><button aria-label="Increase font size" onClick={() => edit({ fontSize: Math.round(selEl.fontSize ?? 32) + 2 })}>+</button></span></>}
        <span className="rel"><button className="cx" aria-label={selEl.type === "text" ? "Text color" : selEl.type === "line" ? "Line color" : "Fill color"} aria-expanded={pop === "color"} onClick={() => setPop(p => p === "color" ? null : "color")}>{selEl.type === "text" ? <span className="A">A<i style={{ background: /^#/.test(selEl.fill) ? selEl.fill : "linear-gradient(90deg,#f00,#fc0,#0c0,#09f,#90f)" }} /></span> : <span className="sq" style={{ background: selEl.type === "line" ? selEl.stroke : selEl.type === "image" ? "#ccc" : selEl.fill }} />}</button>
          {pop === "color" && <div className="cv-pop cp"><div className="tb">{PALETTE.slice(0, 16).map(c => swatch(c, selEl.type === "line" ? selEl.stroke : selEl.fill, c2 => edit(selEl.type === "line" ? { stroke: c2 } : { fill: c2 })))}<input aria-label="Custom color" type="color" className="cv-color" value={/^#[0-9a-f]{6}$/i.test(selEl.type === "line" ? selEl.stroke : selEl.fill) ? (selEl.type === "line" ? selEl.stroke : selEl.fill) : "#000000"} onChange={e => edit(selEl.type === "line" ? { stroke: e.target.value } : { fill: e.target.value })} /></div></div>}</span>
        {selEl.type === "text" && <>
          <button className={"cx" + ((selEl.fontWeight ?? 400) >= 700 ? " on" : "")} aria-label="Bold" onClick={() => edit({ fontWeight: (selEl.fontWeight ?? 400) >= 700 ? 400 : 700 })}><b>B</b></button>
          <button className={"cx" + (selEl.italic ? " on" : "")} aria-label="Italic" onClick={() => edit({ italic: !selEl.italic })}><i>I</i></button>
          <button className={"cx" + (selEl.underline ? " on" : "")} aria-label="Underline" aria-pressed={!!selEl.underline} onClick={() => edit({ underline: !selEl.underline })}><u>U</u></button>
          <button className={"cx" + (selEl.strikethrough ? " on" : "")} aria-label="Strikethrough" aria-pressed={!!selEl.strikethrough} onClick={() => edit({ strikethrough: !selEl.strikethrough })}><s>S</s></button>
          <button className="cx" aria-label="Change case" onClick={() => { const t = selEl.text ?? ""; edit({ text: t === t.toUpperCase() ? t.toLowerCase() : t.toUpperCase() }); }}>aA</button>
          <button className="cx" aria-label={`Align text ${selEl.align ?? "left"}`} onClick={() => edit({ align: selEl.align === "left" || !selEl.align ? "center" : selEl.align === "center" ? "right" : "left" })}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d={selEl.align === "right" ? "M4 6h16M10 12h10M6 18h14" : selEl.align === "left" || !selEl.align ? "M4 6h16M4 12h10M4 18h14" : "M4 6h16M7 12h10M5 18h14"} /></svg></button>
          <button className="cx" aria-label="List" onClick={() => flash("Lists aren't supported yet")}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" /></svg></button>
          <span className="rel"><button ref={spacingButton} className={"cx" + (pop === "spacing" ? " on" : "")} aria-label="Spacing" aria-haspopup="dialog" aria-expanded={pop === "spacing"} onClick={() => setPop(value => value === "spacing" ? null : "spacing")}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5h6M12 5v10M6 19h12M15 17l3 2-3 2M9 17l-3 2 3 2" /></svg></button>
            {pop === "spacing" && <TextSpacingPanel element={selEl} trigger={spacingButton} onPreview={patch => setDraft(patchEl(current, selEl.id, patch, measure))} onCommit={patch => { edit(patch); setDraft(null); }} onCancel={() => setDraft(null)} onClose={() => setPop(null)} />}
          </span></>}
        <span className="rel"><button className="cx" aria-label="Transparency" aria-expanded={pop === "trans"} onClick={() => setPop(p => p === "trans" ? null : "trans")}><span className="chk" /></button>
          {pop === "trans" && <div className="cv-pop tp"><label className="cv-lbl">Opacity<input aria-label="Opacity" type="range" min={5} max={100} value={Math.round(selEl.opacity * 100)} onChange={e => edit({ opacity: +e.target.value / 100 })} /></label>
            {selEl.type === "rect" && <label className="cv-lbl">Corners<input type="range" min={0} max={200} value={selEl.radius} onChange={e => edit({ radius: +e.target.value })} /></label>}
            {selEl.type !== "text" && selEl.type !== "line" && selEl.type !== "image" && <label className="cv-lbl">Border<input type="range" min={0} max={30} value={selEl.strokeWidth} onChange={e => edit({ strokeWidth: +e.target.value, stroke: selEl.stroke === "#000000" && !selEl.strokeWidth ? "#0E1318" : selEl.stroke })} /></label>}
            {selEl.type === "line" && <label className="cv-lbl">Weight<input type="range" min={1} max={40} value={selEl.strokeWidth} onChange={e => edit({ strokeWidth: +e.target.value })} /></label>}</div>}</span>
        <button className="cx tx" onClick={() => flash("Effects aren't supported yet")}>Effects</button>
        <button className="cx tx" onClick={() => flash("Animations aren't supported yet")}>Animate</button>
        </>}
      {!cropping && <button ref={positionButton} type="button" className="cx tx" aria-expanded={positionOpen && panelOpen} aria-controls="editor-panel" onClick={togglePosition}>Position</button>}
    </div>
    <div className="cv-body">
      <nav className="cv-rail" aria-label="Tools">{([["ai", "CanvaIsDead AI", ""], ["tpl", "Templates", "templates"], ["shapes", "Elements", "elements"], ["text", "Text", "text"], ["crown", "Brand", "background"], ["up", "Uploads", "uploads"], ["tools", "Tools", ""], ["folder", "Projects", ""], ["apps", "Apps", ""]] as [string, string, string][]).map(([i, l, t]) => <button key={l} className={tab === t && t && !positionOpen ? "on" : ""} aria-pressed={tab === t && panelOpen && !positionOpen} onClick={() => { if (t) { setTab(t as typeof tab); setPositionOpen(false); setPanelOpen(true); } else flash(`${l} is not implemented yet`); }}><span><Ic n={i} s={20} /></span>{l}</button>)}</nav>
      <button type="button" className="cv-panel-toggle" aria-label={panelOpen ? "Hide side panel" : "Show side panel"} aria-expanded={panelOpen} aria-controls="editor-panel" onClick={() => setPanelOpen(!panelOpen)}><Ic n={panelOpen ? "chevl" : "chevr"} s={16} /></button>
      <aside className="cv-panel" id="editor-panel" hidden={!panelOpen}>
        {cropping ? <ImageCropPanel crop={crop} onDone={() => finishCrop(true)} onCancel={() => finishCrop(false)} /> : positionOpen ? panelOpen && <PositionPanel design={d} ids={selectedIds} measure={measure} onChange={apply} onSelect={selectLayer} onMenu={openLayerActions} onClose={closePosition} /> : <>
        {tab === "templates" && <><label className="cv-psearch"><Ic n="plus" s={16} /><input placeholder={`Search ${designKind.toLowerCase()} templates`} aria-label="Search templates" value={templateQuery} onChange={event => setTemplateQuery(event.currentTarget.value)} />{templateQuery && <button type="button" className="cv-clear-search" aria-label="Clear template search" onClick={() => setTemplateQuery("")}><Ic n="x" s={16} /></button>}<Ic n="mic" s={16} /></label><div className="cv-tpls">{templates.map(({ template: t, preview: td }) => <button key={t.id} className="cv-tpl" title={t.name} aria-label={`Template ${t.name}`} onClick={() => { applyDocument(design => { const next = editPage(design, activePage.id, () => resizeCanvas(td, design.w, design.h)); return { ...next, name: design.name === "Untitled design" ? t.name : design.name }; }); clearInteraction(); if (!wideEditor) setPanelOpen(false); trackWebsite("website_template_applied", {}); flash("Template applied"); }}>
          <span><DesignArtwork design={td} /></span></button>)}</div>{!templates.length && <p role="status" className="ids-muted">No templates match your search.</p>}</>}
        {tab === "elements" && <ElementsPanel view={elementsView} setView={setElementsView} library={elementLibrary} ready={elementLibraryReady} status={elementLibrarySave.status} onRetry={elementLibrarySave.retry} onStar={id => setElementLibrary(previous => starElement(previous, id))} onAdd={addFromElements} onUploads={() => setTab("uploads")} />}
        {tab === "text" && <><label className="cv-psearch"><Ic n="search" s={16} /><input placeholder="Search fonts and combinations" aria-label="Search fonts" /></label>
          <button className="cv-purple full" onClick={() => add("text", { text: "Add a text box", fontSize: Math.round(current.w * 0.04), fontWeight: 400 })}><Ic n="text" s={16} /> Add a text box</button><button className="cv-outl"><Ic n="ai" s={16} /> Magic Write</button>
          <div className="cv-bk"><b>Brand Kit</b><span>Edit <Ic n="crown" s={12} /></span></div><button className="cv-outl sm">Add your brand fonts</button>
          <h4>Default text styles</h4><div className="cv-stack">
          <button style={{ fontSize: 24, fontWeight: 800 }} onClick={() => add("text", { text: "Add a heading", fontSize: Math.round(current.w * 0.048), fontWeight: 800 })}>Add a heading</button>
          <button style={{ fontSize: 17, fontWeight: 700 }} onClick={() => add("text", { text: "Add a subheading", fontSize: Math.round(current.w * 0.03), fontWeight: 600 })}>Add a subheading</button>
          <button style={{ fontSize: 12 }} onClick={() => add("text", { text: "Add a little bit of body text", fontSize: Math.round(current.w * 0.02), fontWeight: 400 })}>Add a little bit of body text</button></div>
          <h4>Dynamic text</h4><button className="cv-dyn" onClick={() => add("text", { text: "1", fontSize: Math.round(current.w * 0.04), fontWeight: 600 })}><span>1</span>Page numbers</button>
          <h4>Font combinations</h4><div className="cv-fc"><button style={{ color: "#12b5c9", fontWeight: 900, fontSize: 34 }} onClick={() => add("text", { text: "ROCK", fontSize: Math.round(current.w * 0.1), fontWeight: 900, fill: "#12B5C9" })}>ROCK</button><button style={{ color: "#f26a1b", fontWeight: 800, fontSize: 20 }} onClick={() => add("text", { text: "CUSTOM PAINT", fontSize: Math.round(current.w * 0.06), fontWeight: 800, fill: "#F26A1B" })}>CUSTOM PAINT</button></div></>}
        {tab === "uploads" && <UploadsPanel uploads={uploads} view={uploadView} setView={setUploadView} onChoose={items => { void chooseUploads(items); }} inserting={insertingUpload} insertError={uploadInsertError} />}
        {tab === "background" && <><h3>Page color</h3><div className="tb">{PALETTE.map(c => swatch(c, current.bg, c2 => apply(latest => touch({ ...latest, bg: c2 }))))}<input aria-label="Page color" type="color" className="cv-color" value={current.bg} onChange={event => { const bg = event.currentTarget.value; apply(latest => touch({ ...latest, bg })); }} /></div></>}
        </>}
      </aside>
      <main className={"cv-stage" + (showNotes ? " cv-notes-open" : "")} ref={wrap} data-group-context={scope ?? undefined} onDragOver={event => { if (acceptsDrop(event) && canvasDropPoint(event)) { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; } }} onDrop={dropOnCanvas} onContextMenu={event => {
        if (editing || cropping || gridView || drag.current || !(event.target instanceof Element) || (event.target !== event.currentTarget && !event.target.closest('[data-testid="page"]'))) return;
        event.preventDefault(); contextMenuTrigger.current = svgRef.current; const box = svgRef.current!.getBoundingClientRect(), point = { x: (event.clientX - box.left) / scale, y: (event.clientY - box.top) / scale };
        const hit = hitTest(current, point.x, point.y, measure, true);
        if (!hit || !selectedIds.includes(hit.id)) { setSelection(hit ? expandGroupSelection(current.els, [hit.id]) : []); setGroupScope(null); }
        setMultiSelect(false); setContextMenu({ x: event.clientX, y: event.clientY, point });
      }} onPointerDown={e => { if (e.target === e.currentTarget) down(e, true); }} onPointerMove={move} onPointerUp={up} onPointerCancel={cancelDrag} onLostPointerCapture={cancelDrag}>
        <div className="cv-page-actions" role="group" aria-label="Page actions">
          <label>Page {pageIndex + 1}<input aria-label="Page title" placeholder="Add page title" value={activePage.title} onChange={event => { const title = event.currentTarget.value; applyDocument(design => titlePage(design, activePage.id, title)); }} /></label>
          <button aria-label="Move page earlier" disabled={pageIndex === 0} onClick={() => reorderPage(activePage.id, pageIndex - 1)}>↑</button>
          <button aria-label="Move page later" disabled={pageIndex === pages.length - 1} onClick={() => reorderPage(activePage.id, pageIndex + 1)}>↓</button>
          <button aria-label="Duplicate page" disabled={pages.length >= MAX_PAGES} onClick={copyPage}><Ic n="copy" s={18} /></button>
          <button aria-label="Delete page" disabled={pages.length === 1} onClick={removePage}><Ic n="trash" s={18} /></button>
          <button aria-label="Add page" disabled={pages.length >= MAX_PAGES} onClick={newPage}><Ic n="plus" s={18} /></button>
          {!gridView && <button aria-label={multiSelect ? "Done selecting" : "Select multiple"} aria-pressed={multiSelect} onClick={() => { setMultiSelect(value => !value); setEditing(null); }}>{multiSelect ? "Done" : "Select multiple"}</button>}
          {!gridView && <button aria-label="More canvas actions" aria-haspopup="menu" onClick={openActions}><Ic n="more" s={18} /></button>}
          {scope && <button type="button" onClick={selectParent}>Select parent group</button>}
          {multiSelect && <span className="cv-selection-help" role="status">Tap elements to add or remove them.</span>}
          {gridView && <button onClick={() => setGridView(false)}>Edit page</button>}
        </div>
        <div hidden={gridView} className="cv-page" style={{ width: d.w * scale, height: d.h * scale }}>
          <svg ref={svgRef} data-testid="page" tabIndex={0} aria-label="Design canvas" width={d.w * scale} height={d.h * scale} viewBox={`0 0 ${d.w} ${d.h}`} onPointerDown={event => down(event)} onDoubleClick={ev => { if (multiSelect || cropping) return; const p = { x: (ev.clientX - svgRef.current!.getBoundingClientRect().left) / scale, y: (ev.clientY - svgRef.current!.getBoundingClientRect().top) / scale }; const hit = hitTest(current, p.x, p.y, measure, true); if (hit?.type === "text" && !hit.locked) { setSel(hit.id); setGroupScope(hit.groupPath?.at(-1) ?? null); setEditing(hit.id); } else if (hit?.type === "image") startCrop(hit); }} style={{ display: "block", touchAction: "none", cursor: marquee ? "crosshair" : drag.current ? "grabbing" : "default" }}>
            <rect width={d.w} height={d.h} fill={d.bg} />
            <ArtworkElements elements={d.els} measure={measure} hiddenId={editing} />
            {marquee && <rect data-testid="marquee" x={marquee.x} y={marquee.y} width={marquee.w} height={marquee.h} fill="#8b3dff1a" stroke="#8b3dff" strokeWidth={1 / scale} pointerEvents="none" />}
            {guides.x.map(x => <line key={"x" + x} x1={x} x2={x} y1={0} y2={d.h} stroke="#FF3D9A" strokeWidth={1 / scale} />)}{guides.y.map(y => <line key={"y" + y} y1={y} y2={y} x1={0} x2={d.w} stroke="#FF3D9A" strokeWidth={1 / scale} />)}
            {multi && bounds && !editing && !cropping && <g data-testid="multi-selection" data-count={selected.length} data-group-id={selectedGroupId ?? undefined}>
              {selected.map(element => { const height = elHeight(element, measure); return <rect key={element.id} data-selected-id={element.id} x={element.x} y={element.y} width={element.w} height={Math.max(1, height)} transform={`rotate(${element.rotation} ${element.x + element.w / 2} ${element.y + height / 2})`} fill="none" stroke="#8b3dff" strokeWidth={1 / scale} strokeDasharray={element.locked ? `${4 / scale} ${3 / scale}` : undefined} pointerEvents="none" />; })}
              <rect x={bounds.x} y={bounds.y} width={bounds.w} height={bounds.h} fill="none" stroke="#8b3dff" strokeWidth={2 / scale} pointerEvents="none" />
              {!multiSelect && !selected.some(element => element.locked) && <>
                {HANDLES.filter(([handle]) => handle.length === 2).map(([handle, x, y]) => <circle key={handle} data-multi-handle={handle} cx={bounds.x + bounds.w * x} cy={bounds.y + bounds.h * y} r={7.5 / scale} fill="#fff" stroke="#8b8d98" strokeWidth={1.2 / scale} style={{ cursor: `${handle}-resize` }} onPointerDown={event => startMultiHandle(event, "multi-resize", handle)} />)}
                <g data-multi-handle="rotate" transform={`translate(${bounds.x + bounds.w / 2} ${bounds.y + bounds.h + 36 / scale}) scale(${1 / scale})`} style={{ cursor: "grab" }} onPointerDown={event => startMultiHandle(event, "multi-rotate")}><circle r={13} fill="#fff" stroke="#8b8d98" strokeWidth={1.2} /><path d="M-7 2a7 7 0 1111 3M6 0v6H0" fill="none" stroke="#0e1318" strokeWidth={1.5} /></g>
              </>}
            </g>}
            {selEl && !editing && !cropping && <g transform={`rotate(${selEl.rotation} ${selEl.x + selEl.w / 2} ${selEl.y + selH / 2})`} data-testid="selection">
              <rect x={selEl.x} y={selEl.y} width={selEl.w} height={Math.max(selH, 1)} fill="none" stroke="var(--ids-color-primary)" strokeWidth={2 / scale} pointerEvents="none" />
              {!selEl.locked && !multiSelect && HANDLES.filter(([hd]) => selEl.type === "text" ? ["nw", "ne", "se", "sw", "e", "w"].includes(hd) : selEl.type === "line" ? ["e", "w"].includes(hd) : true).map(([hd, fx, fy]) => { const bar = hd === "e" || hd === "w" || hd === "n" || hd === "s", vert = hd === "e" || hd === "w", cx = selEl.x + selEl.w * fx, cy = selEl.y + selH * fy;
                return bar ? <rect key={hd} data-handle={hd} x={cx - (vert ? 4 : 11) / scale} y={cy - (vert ? 11 : 4) / scale} width={(vert ? 8 : 22) / scale} height={(vert ? 22 : 8) / scale} rx={4 / scale} fill="#fff" stroke="#8b8d98" strokeWidth={1.2 / scale} style={{ cursor: hd + "-resize" }} onPointerDown={e => startHandle(e, "resize", hd)} />
                  : <circle key={hd} data-handle={hd} cx={cx} cy={cy} r={7.5 / scale} fill="#fff" stroke="#8b8d98" strokeWidth={1.2 / scale} style={{ cursor: hd + "-resize" }} onPointerDown={e => startHandle(e, "resize", hd)} />; })}
              {!selEl.locked && !multiSelect && <g data-handle="rotate" transform={`translate(${selEl.x + selEl.w / 2} ${selEl.y + selH + 36 / scale}) scale(${1 / scale})`} style={{ cursor: "grab" }} onPointerDown={e => startHandle(e, "rotate")}>
                <circle r={13} fill="#fff" stroke="#8b8d98" strokeWidth={1.2} /><g transform="translate(-8 -8) scale(.667)" fill="none" stroke="#0e1318" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a8 8 0 0113-5l3 2M20 13a8 8 0 01-13 5l-3-2M20 4v4h-4M4 20v-4h4" /></g></g>}</g>}
            {crop.preview && <ImageCropOverlay element={crop.preview} scale={scale} ratio={crop.ratio} onChange={crop.setPreview} />}
          </svg>
          {multi && bounds && !editing && !cropping && !drag.current && (groupable || ungroupable) && <div className="cv-float cv-group-float" role="group" aria-label="Group actions" style={{ left: (bounds.x + bounds.w / 2) * scale, top: Math.max(-22, bounds.y * scale - 50) }} onPointerDown={event => event.stopPropagation()}>
            {groupable && <button type="button" onClick={group}>Group</button>}
            {ungroupable && <button type="button" onClick={ungroup}>Ungroup</button>}
          </div>}
          {selEl && !editing && !cropping && !multiSelect && !drag.current && <div className="cv-float" data-testid="float-toolbar" style={{ left: (selEl.x + selEl.w / 2) * scale, top: Math.max(-22, selEl.y * scale - 50) }} onPointerDown={e => e.stopPropagation()}>
            <button className="ask" onClick={() => flash("Ask CanvaIsDead is not implemented yet")}><BrandMark size={18} />Ask CanvaIsDead</button>
            {ungroupable && <button type="button" onClick={ungroup}>Ungroup</button>}
            <button aria-label="Link" onClick={() => flash("Links aren't supported yet")}><Ic n="link" s={20} /></button>
            <button aria-label="Add comment" onClick={() => flash("Comments aren't supported yet")}><Ic n="comment" s={20} /></button>
            <button aria-label={selEl.locked ? "Unlock" : "Lock"} className={selEl.locked ? "on" : ""} aria-pressed={!!selEl.locked} onClick={() => apply(latest => setElementLocked(latest, selEl.id, !selEl.locked))}><Ic n="lock" s={20} /></button>
            <button aria-label="More" aria-haspopup="menu" aria-expanded={!!contextMenu} onClick={openActions}><Ic n="more" s={22} w={2.6} /></button></div>}
          {textEl && <TextEditor key={textEl.id} element={textEl} scale={scale} measure={measure} onCommit={text => { apply(latest => patchEl(latest, textEl.id, { text }, measure)); setEditing(null); }} />}
        </div>
        <PagesPanel design={h.present} selectedId={activePage.id} grid={gridView} measure={measure} onSelect={selectPage} onReorder={reorderPage} onOpen={() => setGridView(false)} onAdd={newPage} canAdd={pages.length < MAX_PAGES} />
        {showNotes && <section className="cv-notes" aria-label="Page notes"><label htmlFor="page-notes">Notes for page {pageIndex + 1}</label><button type="button" aria-label="Close notes" onClick={() => setShowNotes(false)}><Ic n="x" s={16} /></button><textarea id="page-notes" value={activePage.notes ?? ""} placeholder="Add notes for your presentation" onChange={event => { const notes = event.currentTarget.value; applyDocument(design => setPageNotes(design, activePage.id, notes)); }} /></section>}
        <div className="cv-zoom"><button className="nt" aria-expanded={showNotes} onClick={() => setShowNotes(value => !value)}><Ic n="edit" s={14} /> Notes</button><span className="nt"><Ic n="timer" s={14} /> Timer</span><i className="gap" />
          <button aria-label="Zoom out" onClick={() => setZoom(z => Math.max(0.25, +(z - 0.25).toFixed(2)))}>−</button><input type="range" aria-label="Zoom" min={0.25} max={3} step={0.05} value={zoom} onChange={e => setZoom(+e.target.value)} /><button aria-label="Zoom in" onClick={() => setZoom(z => Math.min(3, +(z + 0.25).toFixed(2)))}>+</button><span className="pc">{Math.round(scale * 100)}%</span><button className="pgs" aria-label={gridView ? "Close grid view" : "Grid view"} aria-pressed={gridView} onClick={() => { clearInteraction(); setGridView(value => !value); }}><Ic n="grid" s={14} /> Pages</button><span className="pc" aria-label="Page count">{pageIndex + 1} / {pages.length}</span><Ic n="full" s={16} /><Ic n="help" s={16} /></div>
        {msg && <div className="cv-toast" role="status">{msg}</div>}
      </main>
    </div>
    {contextMenu && <EditorContextMenu x={contextMenu.x} y={contextMenu.y} actions={menuActions} onClose={closeContextMenu} />}
  </div>;
}
