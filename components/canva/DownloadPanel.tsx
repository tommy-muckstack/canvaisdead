"use client";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { Design } from "@/lib/design/types";
import { designPages } from "@/lib/design/pages";
import { DEFAULT_DOWNLOAD, downloadSettingsKey, exportDesign, readDownloadSettings, selectedPageIds, type DownloadFormat, type DownloadSettings, type PageSelection } from "@/lib/design/download";
import { trackWebsite } from "@/lib/analytics/client";
import { Ic } from "./Ic";

function downloadFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), anchor = document.createElement("a");
  anchor.href = url; anchor.download = name; document.body.appendChild(anchor);
  try { anchor.click(); } finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); }
}

export function DownloadPanel({ design, currentPageId, onBack, onClose }: { design: Design; currentPageId: string; onBack: () => void; onClose: () => void }) {
  const key = downloadSettingsKey(design);
  const [settings, setSettings] = useState<DownloadSettings>(() => {
    try { return readDownloadSettings(localStorage.getItem(key)); } catch { return { ...DEFAULT_DOWNLOAD }; }
  });
  const [remember, setRemember] = useState(() => { try { return localStorage.getItem(key) !== null; } catch { return false; } });
  const [selection, setSelection] = useState<PageSelection>("all");
  const [custom, setCustom] = useState("");
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const abort = useRef<AbortController | null>(null), formatSelect = useRef<HTMLSelectElement>(null);
  const pages = useMemo(() => designPages(design), [design]);
  const current = pages.findIndex(page => page.id === currentPageId);
  const selected = useMemo(() => {
    try { return { ids: selectedPageIds(pages, currentPageId, selection, custom), error: "" }; }
    catch (reason) { return { ids: [], error: reason instanceof Error ? reason.message : "Choose pages to download." }; }
  }, [pages, currentPageId, selection, custom]);
  const pdf = settings.format === "pdf_standard" || settings.format === "pdf_print";
  const busy = progress !== null;
  useEffect(() => { formatSelect.current?.focus(); return () => abort.current?.abort(); }, []);
  const update = (change: Partial<DownloadSettings>) => { setSettings(previous => ({ ...previous, ...change })); setError(""); setNotice(""); };
  const cancel = () => { abort.current?.abort(); abort.current = null; setProgress(null); setNotice("Download cancelled."); };
  const keyboard = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); } };
  const start = async () => {
    if (abort.current || selected.error) return;
    const controller = new AbortController(); abort.current = controller;
    setError(""); setNotice(""); setProgress({ completed: 0, total: selected.ids.length });
    try {
      const file = await exportDesign(design, { ...settings, pageIds: selected.ids }, {
        signal: controller.signal,
        onProgress: (completed, total) => { if (!controller.signal.aborted) setProgress({ completed, total }); },
      });
      if (controller.signal.aborted) return;
      downloadFile(file.blob, file.name);
      trackWebsite("website_export_completed", { format: settings.format });
      let message = "Your download is ready.";
      try { if (remember) localStorage.setItem(key, JSON.stringify(settings)); else localStorage.removeItem(key); }
      catch { message += " Download preferences could not be updated in this browser."; }
      setNotice(message);
    } catch (reason) {
      if (controller.signal.aborted) return;
      trackWebsite("website_export_failed", { format: settings.format });
      setError(reason instanceof Error ? reason.message : "Could not prepare this download. Try fewer pages or a smaller size.");
    } finally {
      if (abort.current === controller) { abort.current = null; if (!controller.signal.aborted) setProgress(null); }
    }
  };
  return <section className="cv-download" onKeyDown={keyboard} aria-labelledby="download-title">
    <div className="hd"><button className="bk" aria-label="Back to sharing" onClick={onBack}><Ic n="chevr" s={16} /></button><b id="download-title">Download</b><button className="cv-download-close" aria-label="Close download" onClick={onClose}>×</button></div>
    <p className="cv-export-page">Page {current + 1} of {pages.length}{pages[current]?.title ? `: ${pages[current].title}` : ""}</p>
    <fieldset disabled={busy}>
      <label className="cv-download-field">File type
        <select ref={formatSelect} value={settings.format} onChange={event => update({ format: event.currentTarget.value as DownloadFormat })}>
          <option value="png">PNG — Suggested</option><option value="jpg">JPG</option><option value="svg">SVG</option>
          <option value="pdf_standard">PDF Standard</option><option value="pdf_print">PDF Print</option>
          <option disabled>Microsoft PowerPoint — not available yet</option><option disabled>MP4 Video — not available yet</option><option disabled>GIF — not available yet</option>
        </select>
      </label>
      <p className="cv-download-help">{pdf ? `Flattened RGB pages at ${settings.format === "pdf_print" ? "300" : "96"} DPI. Text will not be selectable. Crop marks and bleed are not available yet.` : settings.format === "svg" ? "Vector artwork. Text uses fonts installed on the device that opens it." : settings.format === "jpg" ? "Smaller images for sharing. JPG always includes the page background." : "High-quality images. Multiple pages download together in a ZIP file."}</p>
      {!pdf && <label className="cv-download-field">Size <output>{settings.scale}×</output><input type="range" min={0.5} max={4} step={0.25} value={settings.scale} onChange={event => update({ scale: event.currentTarget.valueAsNumber })} /><small>{Math.round(design.w * settings.scale).toLocaleString()} × {Math.round(design.h * settings.scale).toLocaleString()} px</small></label>}
      {settings.format === "jpg" && <label className="cv-download-field">Quality <output>{Math.round(settings.quality * 100)}%</output><input type="range" min={10} max={100} value={Math.round(settings.quality * 100)} onChange={event => update({ quality: event.currentTarget.valueAsNumber / 100 })} /></label>}
      {(settings.format === "png" || settings.format === "svg") && <label className="cv-download-check"><input type="checkbox" checked={settings.transparent} onChange={event => update({ transparent: event.currentTarget.checked })} />Transparent background</label>}
      <label className="cv-download-field">Select pages
        <select value={selection} onChange={event => { setSelection(event.currentTarget.value as PageSelection); setError(""); setNotice(""); }}>
          <option value="all">All pages ({pages.length})</option><option value="current">This page ({current + 1})</option><option value="custom">Custom pages</option>
        </select>
      </label>
      {selection === "custom" && <label className="cv-download-field">Page numbers<input type="text" placeholder="e.g. 1, 3-5" value={custom} aria-invalid={!!selected.error} aria-describedby="download-pages-message" onChange={event => { setCustom(event.currentTarget.value); setError(""); setNotice(""); }} /></label>}
      <p id="download-pages-message" className="cv-download-help" aria-live="polite">{selected.error || `${selected.ids.length} ${selected.ids.length === 1 ? "page" : "pages"} selected${!pdf && selected.ids.length > 1 ? " · ZIP download" : ""}`}</p>
      <label className="cv-download-check"><input type="checkbox" checked={remember} onChange={event => setRemember(event.currentTarget.checked)} />Save download settings</label>
      <small className="cv-download-help">Files are generated on your device.</small>
    </fieldset>
    {error && <p className="cv-download-error" role="alert">{error}</p>}
    {notice && <p className="cv-download-help" role="status">{notice}</p>}
    {progress ? <><p className="cv-download-help" role="status">{progress.completed === progress.total ? "Preparing your file…" : `Preparing page ${progress.completed + 1} of ${progress.total}…`}</p><progress aria-label="Download progress" max={progress.total} value={progress.completed} /><button className="cv-download-cancel" onClick={cancel}>Cancel download</button></> : <button className="cv-purple full" disabled={!!selected.error || !selected.ids.length} onClick={() => void start()}>Download</button>}
  </section>;
}
