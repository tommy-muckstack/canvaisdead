"use client";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { createTimerStore, formatTimer, parseTimer, timerRemaining, timerStorageKey, TIMER_MUSIC, type TimerAction, type TimerMusic } from "@/lib/design/timer";
import { createTimerAudio } from "@/lib/design/timer-audio";
import { Ic } from "./Ic";

export function CountdownTimer({ owner, designId, presenting = false }: { owner: string; designId: string; presenting?: boolean }) {
  const key = timerStorageKey(owner, designId), id = useId();
  const store = useMemo(() => createTimerStore(key, () => window.localStorage), [key]);
  const { state, error } = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const [now, setNow] = useState(Date.now), [open, setOpen] = useState(false), [draft, setDraft] = useState<string | null>(null);
  const [soundError, setSoundError] = useState(""), [audible, setAudible] = useState(false);
  const panel = useRef<HTMLElement>(null), heading = useRef<HTMLHeadingElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const audio = useRef<ReturnType<typeof createTimerAudio> | null>(null), previous = useRef({ running: false, remaining: state.remaining });
  const remaining = timerRemaining(state, now), running = state.deadline !== null && remaining > 0, finished = state.active && remaining === 0;
  const invalid = draft !== null && parseTimer(draft) === null;
  useEffect(() => {
    store.read(); const refresh = () => { store.read(); setNow(Date.now()); setAudible(document.hasFocus() && !document.hidden); };
    const changed = (event: StorageEvent) => { if (event.key === key || event.key === null) refresh(); };
    refresh(); window.addEventListener("storage", changed); window.addEventListener("focus", refresh); window.addEventListener("blur", refresh); document.addEventListener("visibilitychange", refresh);
    return () => { window.removeEventListener("storage", changed); window.removeEventListener("focus", refresh); window.removeEventListener("blur", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [key, store]);
  useEffect(() => { setNow(Date.now()); if (!running) return; const tick = window.setInterval(() => setNow(Date.now()), 200); return () => clearInterval(tick); }, [running, state.deadline]);
  useEffect(() => () => { audio.current?.close(); audio.current = null; }, []);
  useEffect(() => {
    const engine = audio.current;
    engine?.update(running && audible, state.music, state.volume);
    if (audible && engine) {
      if (running && !previous.current.running) engine.cue("start");
      if (running && remaining <= 10_000 && previous.current.remaining > 10_000) engine.cue("warning");
      if (finished && previous.current.running) engine.cue("end");
    }
    previous.current = { running, remaining };
  }, [running, remaining, finished, state.music, state.volume, audible]);
  const unlockSound = useCallback(() => {
    try {
      audio.current ??= createTimerAudio(new AudioContext());
      void audio.current.unlock().then(() => setSoundError("")).catch(() => setSoundError("Sound is unavailable. The countdown will continue."));
    } catch { setSoundError("Sound is unavailable. The countdown will continue."); }
  }, []);
  const dispatch = useCallback((action: TimerAction) => { store.dispatch(action); setNow(Date.now()); }, [store]);
  const minimize = useCallback((restoreFocus = true) => { setOpen(false); setDraft(null); if (restoreFocus) trigger.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    if (!open) return;
    const position = () => { const box = panel.current?.getBoundingClientRect(), anchor = trigger.current?.getBoundingClientRect(); if (!box || !anchor || !panel.current) return;
      panel.current.style.left = `${Math.max(8, Math.min(anchor.left, innerWidth - box.width - 8))}px`;
      panel.current.style.top = `${Math.max(8, Math.min(anchor.top - box.height - 8, innerHeight - box.height - 8))}px`;
    };
    position(); const observer = new ResizeObserver(position); if (panel.current) observer.observe(panel.current); window.addEventListener("resize", position);
    heading.current?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => { const node = event.target as Node; if (!panel.current?.contains(node) && !trigger.current?.contains(node)) minimize(false); };
    window.addEventListener("pointerdown", outside); return () => { window.removeEventListener("pointerdown", outside); window.removeEventListener("resize", position); observer.disconnect(); };
  }, [open, minimize]);
  useEffect(() => {
    if (!presenting) return;
    const shortcut = (event: KeyboardEvent) => {
      const target = event.target as Element, dialog = target?.closest('[role="dialog"]');
      if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || !/^[1-9]$/.test(event.key) || target?.closest('input,textarea,select,button,a,[contenteditable="true"]') || (dialog && dialog !== panel.current)) return;
      event.preventDefault(); dispatch({ type: "set", seconds: Number(event.key) * 60 }); setDraft(null); setOpen(true);
    };
    window.addEventListener("keydown", shortcut); return () => window.removeEventListener("keydown", shortcut);
  }, [presenting, dispatch]);
  const applyTime = () => { if (draft === null) return true; const seconds = parseTimer(draft); if (seconds === null) return false; dispatch({ type: "set", seconds }); setDraft(null); return true; };
  return <>
    <button ref={trigger} type="button" className={`nt cv-timer-trigger${state.active && !running && !finished ? " cv-timer-paused" : ""}`} aria-label="Timer" aria-expanded={open} aria-controls={open ? id : undefined} aria-haspopup="dialog" onClick={() => open ? minimize() : setOpen(true)}>
      <Ic n="timer" s={16} /><span className={state.active ? "cv-timer-mini" : "cv-timer-label"}>{state.active ? formatTimer(remaining) : "Timer"}</span>
    </button>
    {open && createPortal(<section id={id} ref={panel} className={`cv-countdown${presenting ? " cv-countdown-present" : ""}`} role="dialog" aria-labelledby={`${id}-heading`} onKeyDown={event => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); minimize(); }
    }}>
      <header><h2 id={`${id}-heading`} ref={heading} tabIndex={-1}>Timer</h2><button type="button" aria-label="Minimize timer" onClick={() => minimize()}><Ic n="minus" s={20} /></button></header>
      <div className="cv-timer-time" role="timer" aria-live="off" aria-label="Time remaining">{formatTimer(remaining)}</div>
      <form onSubmit={event => { event.preventDefault(); applyTime(); }}><label htmlFor={`${id}-time`}>Duration (minutes:seconds)</label>
        <input id={`${id}-time`} type="text" inputMode="text" autoComplete="off" spellCheck={false} value={draft ?? formatTimer(state.duration)} aria-invalid={invalid} aria-describedby={invalid ? `${id}-invalid` : undefined} onChange={event => setDraft(event.target.value)} onBlur={applyTime} />
        {invalid && <p id={`${id}-invalid`} role="alert">Enter a time from 0:01 to 1439:59.</p>}
      </form>
      <div className="cv-timer-actions"><button type="button" className="cv-timer-play" aria-label={running ? "Pause timer" : "Start timer"} onClick={() => { if (!applyTime()) return; unlockSound(); dispatch({ type: running ? "pause" : "start" }); }}>{running ? "Pause" : "Start"}</button>
        <button type="button" aria-label="Reset timer" onClick={() => { setDraft(null); dispatch({ type: "reset" }); }}><Ic n="undo" s={18} /></button>
        <button type="button" onClick={() => { setDraft(null); dispatch({ type: "add" }); }}>+1 min</button></div>
      <div className="cv-timer-sound"><label>Music<select value={state.music} onChange={event => { unlockSound(); dispatch({ type: "music", value: event.target.value as TimerMusic }); }}>{TIMER_MUSIC.map(value => <option key={value} value={value}>{value === "none" ? "None" : value[0].toUpperCase() + value.slice(1)}</option>)}</select></label>
        <label>Volume<input aria-label="Timer volume" type="range" min={0} max={100} step={1} value={state.volume * 100} onChange={event => { unlockSound(); dispatch({ type: "volume", value: Number(event.target.value) / 100 }); }} /></label></div>
      <p className="cv-timer-status" role="status">{finished ? "Time’s up!" : state.active && !running ? "Paused" : ""}</p>
      {(error || soundError) && <p role="alert">{error || soundError}</p>}
    </section>, document.body)}
  </>;
}
