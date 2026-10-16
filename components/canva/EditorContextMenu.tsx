"use client";
import { useEffect, useId, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

export type EditorMenuAction = { label: string; shortcut?: string; disabled?: boolean; run: () => void; divider?: boolean; checked?: boolean; icon?: ReactNode };
export function EditorContextMenu({ x, y, actions, onClose, label = "Canvas actions", className = "", trigger }: { x: number; y: number; actions: EditorMenuAction[]; onClose: (restoreFocus?: boolean) => void; label?: string; className?: string; trigger?: RefObject<HTMLElement | null> }) {
  const id = useId();
  const menu = useRef<HTMLDivElement>(null), close = useRef(onClose);
  useLayoutEffect(() => { close.current = onClose; });
  useLayoutEffect(() => {
    const node = menu.current; if (!node) return;
    const box = node.getBoundingClientRect();
    node.style.left = `${Math.max(8, Math.min(x, window.innerWidth - box.width - 8))}px`;
    node.style.top = `${Math.max(8, Math.min(y, window.innerHeight - box.height - 8))}px`;
    node.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }, [x, y]);
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !menu.current?.contains(event.target) && !trigger?.current?.contains(event.target)) close.current(false); };
    const dismiss = () => close.current(false);
    window.addEventListener("pointerdown", outside, true); window.addEventListener("resize", dismiss); window.addEventListener("blur", dismiss);
    return () => { window.removeEventListener("pointerdown", outside, true); window.removeEventListener("resize", dismiss); window.removeEventListener("blur", dismiss); };
  }, [trigger]);
  // A transformed toolbar would otherwise make fixed coordinates relative to it.
  return createPortal(<div ref={menu} className={`cv-context-menu ${className}`} role="menu" aria-label={label} style={{ left: x, top: y }} onContextMenu={event => event.preventDefault()} onKeyDown={event => {
    const buttons = Array.from(menu.current!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')), index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "Escape" || event.key === "Tab") { if (event.key === "Escape") event.preventDefault(); event.stopPropagation(); onClose(); return; }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
  }}>
    {actions.map((action, index) => <button key={action.label} type="button" role={action.checked === undefined ? "menuitem" : "menuitemcheckbox"} aria-checked={action.checked} aria-labelledby={`${id}-${index}-label`} aria-describedby={action.shortcut ? `${id}-${index}-shortcut` : undefined} className={action.divider ? "cv-context-divider" : undefined} disabled={action.disabled} onClick={() => { onClose(); action.run(); }}><span id={`${id}-${index}-label`}>{action.icon}{action.label}</span>{action.checked && <span aria-hidden="true">✓</span>}{action.shortcut && <kbd id={`${id}-${index}-shortcut`}>{action.shortcut}</kbd>}</button>)}
  </div>, document.body);
}
