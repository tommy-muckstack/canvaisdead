"use client";
import { useRef, useState } from "react";
import type { El } from "@/lib/design/types";
import { EditorContextMenu } from "./EditorContextMenu";

export function TextListMenu({ element, onChange, onOpen }: { element: El; onChange: (style: El["listStyle"]) => void; onOpen: () => void }) {
  const button = useRef<HTMLButtonElement>(null), [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const open = () => { const box = button.current?.getBoundingClientRect(); if (box) { onOpen(); setPosition({ x: box.left, y: box.bottom + 4 }); } };
  const close = (restoreFocus = true) => { setPosition(null); if (restoreFocus) button.current?.focus({ preventScroll: true }); };
  const options: { label: string; style: El["listStyle"] }[] = [{ label: "No list", style: undefined }, { label: "Bulleted list", style: "bullet" }, { label: "Numbered list", style: "number" }];
  return <>
    <button ref={button} type="button" className={"cx" + (element.listStyle ? " on" : "")} aria-label="List" aria-pressed={!!element.listStyle} aria-haspopup="menu" aria-expanded={!!position}
      onClick={() => { if (position) close(); else open(); }} onKeyDown={event => { if (event.key === "ArrowDown") { event.preventDefault(); open(); } }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11" />{element.listStyle === "number" ? <g fill="currentColor" stroke="none" fontSize="6" fontFamily="sans-serif"><text x="2" y="8">1</text><text x="2" y="14">2</text><text x="2" y="20">3</text></g> : <path d="M4 6h.01M4 12h.01M4 18h.01" />}</svg>
    </button>
    {position && <EditorContextMenu {...position} label="List style" className="cv-list-menu" trigger={button} onClose={close} actions={options.map(option => ({ label: option.label, checked: element.listStyle === option.style, radio: true, run: () => onChange(option.style) }))} />}
  </>;
}
