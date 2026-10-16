"use client";
import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { flushSync } from "react-dom";
import type { El, TextEffect } from "@/lib/design/types";
import { defaultTextEffect, EFFECT_LABELS, TEXT_EFFECTS } from "@/lib/design/text-effects";
import { elementSVGNode, type Measure } from "@/lib/design/ops";
import { SVGArtwork } from "./Artwork";
import { SpacingControl } from "./TextSpacingPanel";

const controls: Record<TextEffect["kind"], (keyof Pick<TextEffect, "offset" | "direction" | "blur" | "transparency" | "thickness" | "intensity" | "spread" | "roundness">)[]> = {
  drop: ["offset", "direction", "blur", "transparency"], glow: ["intensity", "transparency"], echo: ["offset", "direction", "transparency"],
  outline: ["thickness"], background: ["roundness", "spread", "transparency"], splice: ["thickness", "offset", "direction"], hollow: ["thickness"], glitch: ["offset", "direction", "transparency"], neon: ["intensity"],
};
type Change = (effect: TextEffect | undefined) => void;
export function TextEffectsPanel({ element, measure, trigger, onPreview, onCommit, onCancel, onClose }: {
  element: El | null; measure: Measure; trigger: RefObject<HTMLButtonElement | null>; onPreview: Change; onCommit: Change; onCancel: () => void; onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null), heading = useRef<HTMLHeadingElement>(null), pending = useRef<TextEffect | null>(null);
  const actions = useRef({ onCommit, onCancel });
  useLayoutEffect(() => { actions.current = { onCommit, onCancel }; });
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || panel.current?.contains(event.target) || trigger.current?.contains(event.target)) return;
      flushSync(() => { if (pending.current) actions.current.onCommit(pending.current); pending.current = null; });
    };
    const cancel = () => { pending.current = null; actions.current.onCancel(); };
    window.addEventListener("pointerdown", outside, true); window.addEventListener("blur", cancel);
    return () => { window.removeEventListener("pointerdown", outside, true); window.removeEventListener("blur", cancel); actions.current.onCancel(); };
  }, [trigger]);
  const commit: Change = effect => { pending.current = null; onCommit(effect); };
  const cancel = () => { pending.current = null; onCancel(); };
  const close = () => { if (pending.current) commit(pending.current); onClose(); };
  const effect = element?.textEffect, disabled = !element || element.locked;
  const sample = element && { ...element, text: "Ag", x: 15, y: 10, w: 62, fontSize: 30, rotation: 0, opacity: 1, fontWeight: 700, align: "left" as const, lineHeight: 1.2, listStyle: undefined, underline: false, strikethrough: false, letterSpacingEm: 0, fill: "#6e2bd1" };
  return <div ref={panel} className="cv-effects" role="region" aria-label="Text effects" onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); flushSync(() => { cancel(); onClose(); }); }
  }}>
    <header><h3 ref={heading} tabIndex={-1}>Effects</h3><button type="button" aria-label="Close text effects" onClick={close}>×</button></header>
    {disabled ? <p>{element?.locked ? "Unlock this text to apply effects." : "Select a text box to apply effects."}</p> : <>
      <div className="cv-effect-grid" role="group" aria-label="Text effect styles">
        {[undefined, ...TEXT_EFFECTS].map(kind => <button type="button" key={kind ?? "none"} aria-label={kind ? EFFECT_LABELS[kind] : "None"} aria-pressed={effect?.kind === kind}
          onClick={() => commit(kind ? effect?.kind === kind ? effect : defaultTextEffect(kind, element.fill) : undefined)}>
          <svg aria-hidden="true" viewBox="0 0 100 68"><SVGArtwork node={sample ? elementSVGNode({ ...sample, textEffect: kind ? defaultTextEffect(kind, sample.fill) : undefined }, measure) : null} /></svg>
          <span>{kind ? EFFECT_LABELS[kind] : "None"}</span>
        </button>)}
      </div>
      {effect && <div key={effect.kind} className="cv-effect-settings">
        <h4>{EFFECT_LABELS[effect.kind]} settings</h4>
        {controls[effect.kind].map(key => <SpacingControl key={key} label={key[0].toUpperCase() + key.slice(1)} value={effect[key]} min={key === "direction" ? -180 : 0} max={key === "direction" ? 180 : 100} step={1}
          onPreview={value => { const next = { ...effect, [key]: value }; pending.current = next; onPreview(next); }} onCommit={value => commit({ ...effect, [key]: value })} onCancel={cancel} />)}
        {effect.kind !== "hollow" && <label className="cv-effect-color">Effect color<input type="color" aria-label="Effect color" value={effect.color} onChange={event => commit({ ...effect, color: event.currentTarget.value })} /></label>}
        <button type="button" className="cv-outl" onClick={() => commit(undefined)}>Remove effect</button>
      </div>}
    </>}
  </div>;
}
