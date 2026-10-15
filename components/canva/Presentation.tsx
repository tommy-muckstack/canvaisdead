"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { Design } from "@/lib/design/types";
import { designPages, pageCanvas } from "@/lib/design/pages";
import { createPresentationReader, slideIndex, slideMessage, type PresentMode, type SlideCommand } from "@/lib/design/presentation";
import { BP } from "@/lib/basepath";
import { createDesignRepository } from "@/lib/design/repository";
import { SlidePreview } from "./SlidePreview";
import { Ic } from "./Ic";

type Props = { uid: string; id: string; mode: PresentMode; session: string; initialPage: number };
export function PresentationLoader(props: Props) {
  const reader = useMemo(() => createPresentationReader(props.id, () => createDesignRepository().read(props.uid)), [props.uid, props.id]);
  const state = useSyncExternalStore(reader.subscribe, reader.getSnapshot, reader.getServerSnapshot);
  const [live, setLive] = useState(true);
  useEffect(() => {
    if (live || reader.getSnapshot().status === "loading") void reader.read();
    const refresh = () => { if (live) void reader.read(); };
    let channel: BroadcastChannel | null = null;
    try { channel = new BroadcastChannel(`canvaisdead:${props.uid}:design-changes`); channel.onmessage = refresh; } catch { /* Focus and polling still refresh local saved data. */ }
    const timer = channel ? null : window.setInterval(refresh, 10_000);
    window.addEventListener("focus", refresh);
    return () => { window.removeEventListener("focus", refresh); channel?.close(); if (timer !== null) clearInterval(timer); reader.cancel(); };
  }, [props.uid, reader, live]);
  if (state.status === "loading") return <main className="cd" aria-busy>Loading presentation…</main>;
  if (!state.design) return <main className="cd"><h1>Presentation unavailable</h1><p role="alert">{state.error || "This design is not saved in this browser."}</p><Link href="/app">Back to your designs</Link><button onClick={reader.read}>Retry</button></main>;
  return <Presentation {...props} design={state.design} error={state.error} live={live} onLiveChange={setLive} />;
}
function Presentation({ design, uid, mode, session, initialPage, error, live, onLiveChange }: Props & { design: Design; error: string; live: boolean; onLiveChange: (value: boolean) => void }) {
  const pages = useMemo(() => designPages(design), [design]);
  const [selectedId, setSelectedId] = useState(() => pages[Math.max(0, Math.min(pages.length - 1, Math.floor(initialPage) - 1))]?.id ?? pages[0].id);
  const index = Math.max(0, pages.findIndex(page => page.id === selectedId)), active = pages[index];
  const canvas = useMemo(() => pageCanvas(design, active.id), [design, active.id]);
  const upcoming = useMemo(() => index + 1 < pages.length ? pageCanvas(design, pages[index + 1].id) : null, [design, pages, index]);
  const [playing, setPlaying] = useState(mode === "autoplay");
  const [seconds, setSeconds] = useState(5), [loop, setLoop] = useState(false), [fullscreen, setFullscreen] = useState(false);
  const [message, setMessage] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const channel = useRef<BroadcastChannel | null>(null), currentId = useRef(active.id);
  const root = useRef<HTMLElement>(null), gesture = useRef<{ x: number; y: number } | null>(null);
  const router = useRouter();
  const editorPath = `/app/design/${encodeURIComponent(design.id)}`;
  useEffect(() => { currentId.current = active.id; }, [active.id]);
  const select = useCallback((pageId: string) => {
    setSelectedId(pageId);
    try { channel.current?.postMessage({ type: "slide", version: 1, pageId }); } catch { /* Local navigation still works. */ }
  }, []);
  const navigate = useCallback((command: SlideCommand) => { select(pages[slideIndex(index, pages.length, command)].id); }, [index, pages, select]);
  const exit = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    router.push(editorPath);
  }, [editorPath, router]);
  useEffect(() => {
    root.current?.focus();
    let wasFullscreen = !!document.fullscreenElement;
    setFullscreen(wasFullscreen);
    const update = () => {
      const next = !!document.fullscreenElement; setFullscreen(next);
      if (wasFullscreen && !next) router.push(editorPath);
      wasFullscreen = next;
    };
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, [editorPath, router]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); exit(); return; }
      if ((event.target as HTMLElement).closest("input,textarea,select,button,a") || event.metaKey || event.ctrlKey || event.altKey) return;
      const command = ({ ArrowRight: "next", ArrowDown: "next", PageDown: "next", " ": "next", ArrowLeft: "previous", ArrowUp: "previous", PageUp: "previous", Home: "first", End: "last" } as Record<string, SlideCommand>)[event.key];
      if (command) { event.preventDefault(); setPlaying(false); navigate(command); }
    };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  }, [exit, navigate]);
  useEffect(() => {
    if (!playing || pages.length < 2) return;
    const timer = window.setTimeout(() => {
      if (index === pages.length - 1 && !loop) setPlaying(false);
      else select(pages[slideIndex(index, pages.length, "next", loop)].id);
    }, seconds * 1000);
    return () => clearTimeout(timer);
  }, [playing, index, pages, seconds, loop, select]);
  useEffect(() => {
    if (mode !== "presenter") return;
    const start = Date.now(), timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [mode]);
  useEffect(() => {
    if (!session || (mode !== "presenter" && mode !== "audience")) return;
    if (typeof BroadcastChannel === "undefined") { setMessage("This browser cannot synchronize the audience window."); return; }
    const connection = new BroadcastChannel(`canvaisdead:presentation:${uid}:${design.id}:${session}`);
    channel.current = connection;
    connection.onmessage = event => {
      const id = slideMessage(event.data, design);
      if (id) { setSelectedId(id); setPlaying(false); }
      else if (mode === "presenter" && event.data?.type === "hello") connection.postMessage({ type: "slide", version: 1, pageId: currentId.current });
    };
    connection.postMessage(mode === "presenter" ? { type: "slide", version: 1, pageId: currentId.current } : { type: "hello" });
    return () => { connection.close(); channel.current = null; };
  }, [design, mode, session, uid]);
  const toggleFullscreen = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
    catch { setMessage("Full screen is unavailable. You can continue presenting in this window."); }
  };
  const openAudience = () => {
    if (!session) { setMessage("Reopen Presenter view from the editor to connect an audience window."); return; }
    const audience = window.open(`${BP}${editorPath}/present?mode=audience&session=${session}&page=${index + 1}`, `canvaisdead-audience-${session}`);
    if (!audience) setMessage("Allow pop-ups to open the audience window.");
  };
  return <main className={`cv-present ${mode === "presenter" ? "cv-presenter" : ""}`} ref={root} tabIndex={-1} aria-label="Presentation">
    {mode === "presenter" && <header><b>{design.name}</b><span aria-label="Elapsed presentation time">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</span><button onClick={openAudience}>Open audience window</button><button onClick={exit}>Back to editor</button></header>}
    <div className="cv-present-content">
      <div className="cv-present-slide" data-testid="presentation-slide" onPointerDown={event => { gesture.current = { x: event.clientX, y: event.clientY }; }} onPointerUp={event => {
        const start = gesture.current; gesture.current = null; if (!start) return;
        const dx = event.clientX - start.x, dy = event.clientY - start.y;
        if (Math.abs(dx) > 40 && Math.abs(dy) < 80) { setPlaying(false); navigate(dx < 0 ? "next" : "previous"); }
        else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) { setPlaying(false); navigate("next"); }
      }}><SlidePreview design={canvas} label={`Page ${index + 1}${active.title ? `: ${active.title}` : ""}`} /></div>
      {mode === "presenter" && <aside className="cv-presenter-notes"><h2>Next page</h2>{upcoming ? <SlidePreview design={upcoming} label={`Next page: ${index + 2}`} /> : <p>End of presentation</p>}<h2>Notes</h2><p className="cv-speaker-notes">{active.notes || "No notes for this page."}</p></aside>}
    </div>
    <footer className="cv-present-controls">
      <button aria-label="Previous page" disabled={index === 0} onClick={() => { setPlaying(false); navigate("previous"); }}><Ic n="chevl" /></button>
      <label>Page <input aria-label="Go to page" type="number" min={1} max={pages.length} value={index + 1} onChange={event => { const n = Number(event.currentTarget.value); if (Number.isInteger(n) && n >= 1 && n <= pages.length) { setPlaying(false); select(pages[n - 1].id); } }} /> / {pages.length}</label>
      <button aria-label="Next page" disabled={index === pages.length - 1} onClick={() => { setPlaying(false); navigate("next"); }}><Ic n="chevr" /></button>
      {mode !== "audience" && <><button aria-label={playing ? "Pause autoplay" : "Start autoplay"} aria-pressed={playing} onClick={() => setPlaying(value => !value)}>{playing ? "Pause" : "Autoplay"}</button><label>Seconds <select aria-label="Seconds per page" value={seconds} onChange={event => setSeconds(Number(event.currentTarget.value))}>{[2, 3, 5, 10, 15, 30, 60].map(value => <option key={value} value={value}>{value}</option>)}</select></label><label><input type="checkbox" checked={loop} onChange={event => setLoop(event.currentTarget.checked)} /> Loop</label></>}
      <label className="cv-live-toggle"><input type="checkbox" checked={live} onChange={event => onLiveChange(event.currentTarget.checked)} /> Live edits</label>
      <button aria-label={fullscreen ? "Exit full screen" : "Enter full screen"} onClick={toggleFullscreen}><Ic n="full" /></button>
      <button aria-label="Exit presentation" onClick={exit}><Ic n="x" /></button>
    </footer>
    {(error || message) && <p className="cv-present-message" role="status">{error || message}</p>}
  </main>;
}
