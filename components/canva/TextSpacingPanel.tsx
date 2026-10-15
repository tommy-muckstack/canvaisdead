"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { El } from "@/lib/design/types";
import { LETTER_SPACING_MAX, LETTER_SPACING_MIN, LINE_SPACING_MAX, LINE_SPACING_MIN } from "@/lib/design/text-spacing";

type SpacingPatch = Pick<Partial<El>, "letterSpacingEm" | "lineHeight" | "textAnchor">;
type Change = (patch: SpacingPatch) => void;
function SpacingControl({ label, value, min, max, step, onPreview, onCommit, onCancel }: {
  label: string; value: number; min: number; max: number; step: number;
  onPreview: (value: number) => void; onCommit: (value: number) => void; onCancel: () => void;
}) {
  const id = useId(), [raw, setRaw] = useState(String(value)), pending = useRef<number | null>(null), typing = useRef(false);
  useEffect(() => { if (!typing.current) setRaw(String(value)); }, [value]);
  const number = raw.trim() ? Number(raw) : NaN, valid = Number.isFinite(number) && number >= min && number <= max;
  const preview = (next: number) => { pending.current = next; onPreview(next); };
  const finish = () => { const next = pending.current; pending.current = null; if (next !== null) onCommit(next); };
  const cancel = () => { pending.current = null; typing.current = false; onCancel(); setRaw(String(value)); };
  const cancelLatest = useRef(cancel);
  useLayoutEffect(() => { cancelLatest.current = cancel; });
  useEffect(() => { const blur = () => { if (pending.current !== null) cancelLatest.current(); }; window.addEventListener("blur", blur); return () => window.removeEventListener("blur", blur); }, []);
  return <div className="cv-spacing-control">
    <label id={id}>{label}</label>
    <input type="number" aria-label={`${label} value`} min={min} max={max} step={step} value={raw} aria-invalid={!valid}
      onFocus={() => { typing.current = true; }}
      onChange={event => { const text = event.currentTarget.value, next = text.trim() ? Number(text) : NaN; setRaw(text); if (Number.isFinite(next) && next >= min && next <= max) preview(next); else { pending.current = null; onCancel(); } }}
      onBlur={() => { typing.current = false; if (valid) finish(); else cancel(); }}
      onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); if (valid) finish(); else cancel(); } }} />
    <input type="range" aria-labelledby={id} min={min} max={max} step={step} value={value}
      onPointerDown={event => event.currentTarget.setPointerCapture(event.pointerId)}
      onChange={event => { const next = Number(event.currentTarget.value); setRaw(String(next)); preview(next); }}
      onPointerUp={finish} onPointerCancel={cancel} onLostPointerCapture={() => { if (pending.current !== null) cancel(); }} onKeyUp={finish} onBlur={finish} />
  </div>;
}

export function TextSpacingPanel({ element, trigger, onPreview, onCommit, onCancel, onClose }: {
  element: El; trigger: React.RefObject<HTMLButtonElement | null>; onPreview: Change; onCommit: Change; onCancel: () => void; onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null), heading = useRef<HTMLHeadingElement>(null), pending = useRef<SpacingPatch | null>(null);
  const actions = useRef({ onCommit, onCancel, onClose });
  useLayoutEffect(() => { actions.current = { onCommit, onCancel, onClose }; });
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || panel.current?.contains(event.target) || trigger.current?.contains(event.target)) return;
      // Finish before another canvas pointer handler can capture the old document.
      flushSync(() => { if (pending.current) actions.current.onCommit(pending.current); pending.current = null; actions.current.onClose(); });
    };
    window.addEventListener("pointerdown", outside, true);
    return () => { window.removeEventListener("pointerdown", outside, true); actions.current.onCancel(); };
  }, [trigger]);
  const preview: Change = patch => { pending.current = patch; onPreview(patch); };
  const commit: Change = patch => { pending.current = null; onCommit(patch); };
  const cancel = () => { pending.current = null; onCancel(); };
  const close = () => { if (pending.current) commit(pending.current); onClose(); trigger.current?.focus(); };
  return <div ref={panel} className="cv-pop cv-spacing" role="dialog" aria-label="Text spacing" onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); cancel(); onClose(); trigger.current?.focus(); }
  }}>
    <div className="cv-spacing-heading"><h3 ref={heading} tabIndex={-1}>Spacing</h3><button type="button" aria-label="Close text spacing" onClick={close}>×</button></div>
    <SpacingControl label="Letter spacing" value={(element.letterSpacingEm ?? 0) * 1000} min={LETTER_SPACING_MIN * 1000} max={LETTER_SPACING_MAX * 1000} step={1}
      onPreview={value => preview({ letterSpacingEm: value / 1000 })} onCommit={value => commit({ letterSpacingEm: value / 1000 })} onCancel={cancel} />
    <SpacingControl label="Line spacing" value={element.lineHeight ?? 1.2} min={LINE_SPACING_MIN} max={LINE_SPACING_MAX} step={.01}
      onPreview={value => preview({ lineHeight: value })} onCommit={value => commit({ lineHeight: value })} onCancel={cancel} />
    <fieldset><legend>Anchor text box</legend><div className="cv-text-anchors">
      {(["start", "middle", "end"] as const).map(anchor => <button type="button" key={anchor} aria-label={`Anchor ${anchor}`} aria-pressed={(element.textAnchor ?? "start") === anchor} onClick={() => commit({ textAnchor: anchor })}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 2h18v20H3z" opacity=".4" /><path d={anchor === "start" ? "M7 6h10M7 10h10M7 14h6" : anchor === "middle" ? "M7 8h10M7 12h10M7 16h6" : "M7 10h10M7 14h10M7 18h6"} /></svg>
        <span>{anchor === "start" ? "Start" : anchor === "middle" ? "Middle" : "End"}</span>
      </button>)}
    </div></fieldset>
  </div>;
}
