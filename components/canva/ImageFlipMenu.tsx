"use client";
import { useRef, useState } from "react";
import type { El } from "@/lib/design/types";
import type { ImageFlipAxis } from "@/lib/design/image-flip";
import { EditorContextMenu } from "./EditorContextMenu";

export function ImageFlipMenu({ element, onFlip, onOpen }: { element: El; onFlip: (axis: ImageFlipAxis) => void; onOpen: () => void }) {
  const button = useRef<HTMLButtonElement>(null), [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const open = () => { const box = button.current?.getBoundingClientRect(); if (box) { onOpen(); setPosition({ x: box.left, y: box.bottom + 4 }); } };
  const close = (restoreFocus = true) => { setPosition(null); if (restoreFocus) button.current?.focus({ preventScroll: true }); };
  return <>
    <button ref={button} type="button" className={"cx tx" + (position ? " on" : "")} aria-haspopup="menu" aria-expanded={!!position}
      onClick={() => { if (position) close(); else open(); }} onKeyDown={event => { if (event.key === "ArrowDown") { event.preventDefault(); open(); } }}>Flip</button>
    {position && <EditorContextMenu {...position} label="Flip image" className="cv-flip-menu" trigger={button} onClose={close} actions={(["horizontal", "vertical"] as const).map(axis => ({
      label: `Flip ${axis}`, checked: !!element[axis === "horizontal" ? "flipX" : "flipY"], run: () => onFlip(axis),
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><g transform={axis === "vertical" ? "rotate(90 12 12)" : undefined}><path d="M12 2v20" strokeDasharray="2 2" /><path d="M9 5v14H3z" /><path d="M15 5v14h6z" opacity=".5" /></g></svg>,
    }))} />}
  </>;
}
