"use client";
import { useEffect, useId, useRef, type RefObject } from "react";
import { MAX_PAGES } from "@/lib/design/pages";
import type { ProjectPagePlacement } from "@/lib/design/project-pages";
import { Ic } from "./Ic";

export function ProjectPageChoice({ name, count, existingCount, disabled, error, trigger, onClose, onApply }: {
  name: string; count: number; existingCount: number; disabled: boolean; error: string;
  trigger: RefObject<HTMLElement | null>; onClose: () => void; onApply: (placement: ProjectPagePlacement) => void;
}) {
  const id = useId(), dialog = useRef<HTMLDialogElement>(null), cancel = useRef<HTMLButtonElement>(null);
  const replace = existingCount + count - 1 <= MAX_PAGES, add = existingCount + count <= MAX_PAGES;
  useEffect(() => {
    const node = dialog.current, button = trigger.current; if (!node) return;
    node.showModal(); cancel.current?.focus();
    return () => { node.close(); if (button?.isConnected) button.focus({ preventScroll: true }); };
  }, [trigger]);
  return <dialog ref={dialog} className="cv-project-choice" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => {
    if (event.target !== event.currentTarget) return; const box = event.currentTarget.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose();
  }} onKeyDown={event => {
    if (event.key !== "Tab") return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")), first = buttons[0], last = buttons.at(-1);
    if (event.shiftKey && document.activeElement === first && last) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last && first) { event.preventDefault(); first.focus(); }
  }}>
    <header><h2 id={`${id}-title`}>Use pages from this design?</h2><button type="button" aria-label="Close page options" onClick={onClose}><Ic n="x" s={20} /></button></header>
    <p id={`${id}-description`}>{count} {count === 1 ? "page" : "pages"} from <b>{name}</b>. Replace the current page or add {count === 1 ? "a new page" : "new pages"} after it. The source design stays unchanged.</p>
    {(!replace || !add) && <p className="ids-muted">Designs can have up to {MAX_PAGES} pages. Remove pages or choose fewer to make room.</p>}
    {error && <p role="alert">{error}</p>}
    <footer><button ref={cancel} type="button" onClick={onClose}>Cancel</button><button type="button" disabled={disabled || !replace} onClick={() => onApply("replace")}>Replace current page</button><button type="button" className="cv-purple" disabled={disabled || !add} onClick={() => onApply("add")}>{count === 1 ? "Add as new page" : "Add as new pages"}</button></footer>
  </dialog>;
}
