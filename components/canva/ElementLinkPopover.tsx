"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ElementLink, Page } from "@/lib/design/types";
import { linkLabel, normalizeLinkURL } from "@/lib/design/links";
import { Ic } from "./Ic";

export function ElementLinkPopover({ initial, hasLinks, pages, x, y, onApply, onClose }: {
  initial?: ElementLink; hasLinks: boolean; pages: Page[]; x: number; y: number;
  onApply: (link: ElementLink | null) => void; onClose: (restoreFocus?: boolean) => void;
}) {
  const id = useId(), panel = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initial?.kind === "url" ? initial.url : ""), [pageId, setPageId] = useState(initial?.kind === "page" ? initial.pageId : "");
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const current: ElementLink | null = pageId ? { kind: "page", pageId } : value.trim() && normalizeLinkURL(value) ? { kind: "url", url: normalizeLinkURL(value)! } : null;
  const apply = (restoreFocus = true) => {
    if ((value.trim() && !current) || (pageId && !pages.some(page => page.id === pageId))) { setError(pageId ? "This page is no longer available. Choose another page or remove the link." : "Enter a website, email or phone link, or choose a page below."); return false; }
    onApply(current); onClose(restoreFocus); return true;
  };
  const actions = useRef({ apply, onClose }); useLayoutEffect(() => { actions.current = { apply, onClose }; });
  useLayoutEffect(() => {
    const position = () => { const box = panel.current?.getBoundingClientRect(); if (!box || !panel.current) return; panel.current.style.left = `${Math.max(8, Math.min(x, innerWidth - box.width - 8))}px`; panel.current.style.top = `${Math.max(8, Math.min(y, innerHeight - box.height - 8))}px`; };
    position(); const observer = new ResizeObserver(position); if (panel.current) observer.observe(panel.current); window.addEventListener("resize", position); input.current?.focus(); input.current?.select();
    return () => { observer.disconnect(); window.removeEventListener("resize", position); };
  }, [x, y]);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (panel.current?.contains(event.target as Node)) return;
      if (!actions.current.apply(false)) { event.preventDefault(); event.stopPropagation(); input.current?.focus(); }
    };
    window.addEventListener("pointerdown", outside, true); return () => window.removeEventListener("pointerdown", outside, true);
  }, []);
  const copy = async () => {
    try { if (!current || current.kind !== "url" || !navigator.clipboard?.writeText) throw Error(); await navigator.clipboard.writeText(current.url); setNotice("Link copied."); }
    catch { setError("The link could not be copied. Select it in the field and copy it manually."); }
  };
  const query = !normalizeLinkURL(value) ? value.toLocaleLowerCase().trim() : "";
  const visible = pages.filter((page, index) => `Page ${index + 1} ${page.title}`.toLocaleLowerCase().includes(query));
  return createPortal(<div ref={panel} className="cv-link-popover" role="dialog" aria-labelledby={`${id}-heading`} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); } }}>
    <header><h2 id={`${id}-heading`}>Link</h2><button type="button" aria-label="Close link" onClick={() => onClose()}><Ic n="x" s={18} /></button></header>
    <form onSubmit={event => { event.preventDefault(); apply(); }}><label htmlFor={id}>Enter a link or search</label><input ref={input} id={id} value={pageId ? linkLabel({ kind: "page", pageId }, pages) : value} placeholder="Enter a link or search" autoComplete="off" maxLength={4096} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : `${id}-help`} onChange={event => { setPageId(""); setValue(event.target.value); setError(""); setNotice(""); }} />
      <div className="cv-link-actions"><button type="submit" className="cv-purple">Done</button>{current?.kind === "url" && <><a href={current.url} target="_blank" rel="noopener noreferrer" aria-label="Open link">Open</a><button type="button" onClick={copy}>Copy link</button></>}{hasLinks && <button type="button" aria-label="Remove link" onClick={() => { onApply(null); onClose(); }}><Ic n="trash" s={18} /></button>}</div>
    </form>
    {error && <p id={`${id}-error`} role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <h3>Pages in this document</h3><div className="cv-link-pages">{visible.map(page => <button type="button" key={page.id} aria-pressed={page.id === pageId} onClick={() => { onApply({ kind: "page", pageId: page.id }); onClose(); }}><Ic n="file" s={18} /><span>{linkLabel({ kind: "page", pageId: page.id }, pages)}</span></button>)}{!visible.length && <p>No pages found.</p>}</div>
    <p id={`${id}-help`} className="cv-link-help">Links work in presentations and PDF downloads.</p>
  </div>, document.body);
}
