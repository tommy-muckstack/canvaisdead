import type { Design, Page } from "./types";
import { designPages, pageCanvas } from "./pages";
import { approxMeasure, toSVG, type Measure } from "./ops";
import { canvasMeasure, exportBlob, prepareExportFonts, rasterDimensions } from "./render";
import { MAX_DOWNLOAD_BYTES, zipFiles } from "./zip";

export const DOWNLOAD_FORMATS = ["png", "jpg", "svg", "pdf_standard", "pdf_print"] as const;
export type DownloadFormat = typeof DOWNLOAD_FORMATS[number];
export type DownloadSettings = { format: DownloadFormat; scale: number; quality: number; transparent: boolean };
export const DEFAULT_DOWNLOAD: DownloadSettings = { format: "png", scale: 1, quality: 0.92, transparent: false };
export type PageSelection = "all" | "current" | "custom";
export function selectedPageIds(pages: Page[], currentId: string, selection: PageSelection, custom: string): string[] {
  if (selection === "all") return pages.map(page => page.id);
  if (selection === "current") {
    if (!pages.some(page => page.id === currentId)) throw new Error("This page no longer exists.");
    return [currentId];
  }
  const numbers = new Set<number>();
  for (const part of custom.split(",")) {
    const match = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error("Enter page numbers or ranges, such as 1, 3-5.");
    const start = Number(match[1]), end = Number(match[2] ?? match[1]);
    if (start < 1 || end < start || end > pages.length) throw new Error(`Choose pages between 1 and ${pages.length}.`);
    for (let page = start; page <= end; page++) numbers.add(page);
  }
  return pages.filter((_, index) => numbers.has(index + 1)).map(page => page.id);
}
export function validDownloadSettings(input: unknown): input is DownloadSettings {
  if (!input || typeof input !== "object") return false;
  const value = input as DownloadSettings;
  return DOWNLOAD_FORMATS.includes(value.format) && Number.isFinite(value.scale) && value.scale >= 0.5 && value.scale <= 4 &&
    Number.isFinite(value.quality) && value.quality >= 0.1 && value.quality <= 1 && typeof value.transparent === "boolean";
}
// Store only options shared by this design size, never content, IDs or page choices.
export const downloadSettingsKey = (design: Pick<Design, "w" | "h">) => `canvaisdead:download:v1:${design.w}x${design.h}`;
export function readDownloadSettings(raw: string | null): DownloadSettings {
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (validDownloadSettings(value)) return { format: value.format, scale: value.scale, quality: value.quality, transparent: value.transparent };
  } catch { /* Optional preferences never block downloads. */ }
  return { ...DEFAULT_DOWNLOAD };
}
function filename(name: string): string {
  // eslint-disable-next-line no-control-regex -- Exclude control bytes from filesystem names.
  return name.normalize("NFC").replace(/[<>:"/\\|?*\x00-\x1f]/g, "-").replace(/^[. ]+|[. ]+$/g, "").slice(0, 120).replace(/[. ]+$/g, "") || "design";
}
type DownloadControls = { signal?: AbortSignal; onProgress?: (completed: number, total: number) => void; measure?: Measure };
export async function exportDesign(design: Design, options: DownloadSettings & { pageIds: string[] }, controls: DownloadControls = {}, raster = exportBlob): Promise<{ blob: Blob; name: string }> {
  if (!validDownloadSettings(options)) throw new Error("Choose valid download settings.");
  // Capture all pages and options before the first await; subsequent editor changes cannot alter this download.
  const snapshot = structuredClone(design), settings = { ...options }, all = designPages(snapshot), chosen = new Set(options.pageIds);
  if (!chosen.size || [...chosen].some(id => !all.some(page => page.id === id))) throw new Error("Choose existing pages to download.");
  const pages = all.filter(page => chosen.has(page.id));
  const check = () => { if (controls.signal?.aborted) throw new DOMException("Download cancelled.", "AbortError"); };
  const pdfFormat = settings.format === "pdf_standard" || settings.format === "pdf_print";
  const scale = pdfFormat ? (settings.format === "pdf_print" ? 300 / 96 : 1) : settings.scale;
  if (settings.format !== "svg") rasterDimensions(snapshot, scale);
  check(); controls.onProgress?.(0, pages.length);
  let measure = controls.measure ?? approxMeasure;
  if (typeof document !== "undefined") {
    await prepareExportFonts(pages.flatMap(page => page.els));
    const context = document.createElement("canvas").getContext("2d");
    if (context) measure = canvasMeasure(context);
  }
  check();
  const pdf = pdfFormat ? await (await import("pdf-lib")).PDFDocument.create() : null;
  pdf?.setProducer("CanvaIsDead"); pdf?.setCreator("CanvaIsDead");
  const files: { name: string; data: Uint8Array<ArrayBuffer> }[] = [], base = filename(snapshot.name);
  let totalBytes = 0, single: Blob | null = null;
  for (let index = 0; index < pages.length; index++) {
    check();
    const page = pages[index], canvas = pageCanvas(snapshot, page.id);
    const blob = settings.format === "svg" ? new Blob([toSVG(canvas, measure, { scale, transparent: settings.transparent })], { type: "image/svg+xml" }) :
      await raster(canvas, settings.format === "jpg" ? "jpg" : "png", scale, { transparent: !pdf && settings.format !== "jpg" && settings.transparent, quality: settings.quality, opaque: pdfFormat });
    check(); totalBytes += blob.size;
    if (totalBytes > MAX_DOWNLOAD_BYTES) throw new Error("Download is too large for one file. Select fewer pages.");
    const data = new Uint8Array(await blob.arrayBuffer());
    check();
    if (pdf) {
      const image = await pdf.embedPng(data), size: [number, number] = [snapshot.w * 72 / 96, snapshot.h * 72 / 96];
      pdf.addPage(size).drawImage(image, { x: 0, y: 0, width: size[0], height: size[1] });
    } else {
      const suffix = all.length > 1 ? `-page-${all.findIndex(item => item.id === page.id) + 1}` : "";
      files.push({ name: `${base}${suffix}.${settings.format}`, data });
      if (pages.length === 1) single = blob;
    }
    controls.onProgress?.(index + 1, pages.length);
    // Let the browser paint progress and process cancellation between pages.
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  check();
  if (pdf) {
    const bytes = await pdf.save(); check();
    if (bytes.byteLength > MAX_DOWNLOAD_BYTES) throw new Error("Download is too large for one file. Select fewer pages.");
    return { blob: new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), name: `${base}.pdf` };
  }
  return single ? { blob: single, name: files[0].name } : { blob: zipFiles(files), name: `${base}.zip` };
}
