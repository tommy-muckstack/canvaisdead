"use client";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { Design } from "@/lib/design/types";
import { designPages } from "@/lib/design/pages";
import { DEFAULT_DOWNLOAD, downloadSettingsKey, exportDesign, readDownloadSettings, selectedPageIds, type DownloadFormat, type DownloadSettings, type PageSelection } from "@/lib/design/download";
import { track, EVENTS } from "@/lib/analytics";
import { Ic } from "./Ic";

function downloadFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), anchor = document.createElement("a");
  anchor.href = url; anchor.download = name; document.body.appendChild(anchor);
  try { anchor.click(); } finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); }
}

export function DownloadPanel({ design, currentPageId, onBack, onClose }: { design: Design; currentPageId: string; onBack: () => void; onClose: () => void }) {
  const id = useId();
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
      track(EVENTS.app_design_exported, { format: settings.format });
      let message = "Your download is ready.";
      try { if (remember) localStorage.setItem(key, JSON.stringify(settings)); else localStorage.removeItem(key); }
      catch { message += " Download preferences could not be updated in this browser."; }
      setNotice(message);
    } catch (reason) {
      if (controller.signal.aborted) return;
      track(EVENTS.app_design_export_failed, { format: settings.format });
      setError(reason instanceof Error ? reason.message : "Could not prepare this download. Try fewer pages or a smaller size.");
    } finally {
      if (abort.current === controller) { abort.current = null; if (!controller.signal.aborted) setProgress(null); }
    }
  };
  return <section className="cv-download" onKeyDown={keyboard} aria-labelledby={`${id}-title`}>
    <div className="hd"><button className="bk" aria-label="Back to sharing" onClick={onBack}><Ic n="chevr" s={16} /></button><b id={`${id}-title`}>Download</b><button className="cv-download-close" aria-label="Close download" onClick={onClose}>×</button></div>
    <p className="cv-export-page">Page {current + 1} of {pages.length}{pages[current]?.title ? `: ${pages[current].title}` : ""}</p>
    <fieldset disabled={busy}>
      <div className="cv-download-field"><label htmlFor={`${id}-format`}>File type</label>
        <select id={`${id}-format`} ref={formatSelect} aria-describedby={`${id}-format-help`} value={settings.format} onChange={event => update({ format: event.currentTarget.value as DownloadFormat })}>
          <option value="png">PNG — Suggested</option><option value="jpg">JPG</option><option value="svg">SVG</option>
          <option value="pdf_standard">PDF Standard</option><option value="pdf_print">PDF Print</option>
          <option disabled>Microsoft PowerPoint — not available yet</option><option disabled>MP4 Video — not available yet</option><option disabled>GIF — not available yet</option>
        </select>
      </div>
      <p id={`${id}-format-help`} className="cv-download-help">{pdf ? `Rasterized RGB artwork at ${settings.format === "pdf_print" ? "300" : "96"} DPI. Links remain clickable; text is not selectable. Links to excluded pages are omitted. Crop marks and bleed are not available yet.` : settings.format === "svg" ? "Vector artwork. Text uses fonts installed on the device that opens it." : settings.format === "jpg" ? "Smaller images for sharing. JPG always includes the page background." : "High-quality images. Multiple pages download together in a ZIP file."}</p>
      {!pdf && <div className="cv-download-field"><label htmlFor={`${id}-size`}>Size</label><output htmlFor={`${id}-size`}>{settings.scale}×</output><input id={`${id}-size`} type="range" min={0.5} max={4} step={0.25} value={settings.scale} aria-valuetext={`${settings.scale} times`} aria-describedby={`${id}-dimensions`} onChange={event => update({ scale: event.currentTarget.valueAsNumber })} /><small id={`${id}-dimensions`}>{Math.round(design.w * settings.scale).toLocaleString()} × {Math.round(design.h * settings.scale).toLocaleString()} px</small></div>}
      {settings.format === "jpg" && <div className="cv-download-field"><label htmlFor={`${id}-quality`}>Quality</label><output htmlFor={`${id}-quality`}>{Math.round(settings.quality * 100)}%</output><input id={`${id}-quality`} type="range" min={10} max={100} value={Math.round(settings.quality * 100)} aria-valuetext={`${Math.round(settings.quality * 100)} percent`} onChange={event => update({ quality: event.currentTarget.valueAsNumber / 100 })} /></div>}
      {(settings.format === "png" || settings.format === "svg") && <label className="cv-download-check"><input type="checkbox" checked={settings.transparent} onChange={event => update({ transparent: event.currentTarget.checked })} />Transparent background</label>}
      <div className="cv-download-field"><label htmlFor={`${id}-pages`}>Select pages</label>
        <select id={`${id}-pages`} aria-describedby={`${id}-pages-message`} value={selection} onChange={event => { setSelection(event.currentTarget.value as PageSelection); setError(""); setNotice(""); }}>
          <option value="all">All pages ({pages.length})</option><option value="current">This page ({current + 1})</option><option value="custom">Custom pages</option>
        </select>
      </div>
      {selection === "custom" && <div className="cv-download-field"><label htmlFor={`${id}-page-numbers`}>Page numbers</label><input id={`${id}-page-numbers`} type="text" placeholder="e.g. 1, 3-5" value={custom} aria-invalid={!!selected.error} aria-describedby={`${id}-pages-message`} onChange={event => { setCustom(event.currentTarget.value); setError(""); setNotice(""); }} /></div>}
      <p id={`${id}-pages-message`} className="cv-download-help" aria-live="polite">{selected.error || `${selected.ids.length} ${selected.ids.length === 1 ? "page" : "pages"} selected${!pdf && selected.ids.length > 1 ? " · ZIP download" : ""}`}</p>
      <label className="cv-download-check"><input type="checkbox" checked={remember} onChange={event => setRemember(event.currentTarget.checked)} />Save download settings</label>
      <small className="cv-download-help">Files are generated on your device.</small>
    </fieldset>
    {error && <p className="cv-download-error" role="alert">{error}</p>}
    {notice && <p className="cv-download-help" role="status">{notice}</p>}
    {progress && <><p className="cv-download-help" role="status">{progress.completed === progress.total ? "Preparing your file…" : `Preparing page ${progress.completed + 1} of ${progress.total}…`}</p><progress aria-label="Download progress" max={progress.total} value={progress.completed} /></>}
    {/* Keep this node mounted so export/cancellation retains keyboard focus. */}
    <button className={busy ? "cv-download-cancel" : "cv-purple full"} disabled={!busy && (!!selected.error || !selected.ids.length)} onClick={busy ? cancel : () => void start()}>{busy ? "Cancel download" : "Download"}</button>
  </section>;
}
