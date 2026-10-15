"use client";
import { useEffect, useLayoutEffect, useRef } from "react";

export type EditorMenuAction = { label: string; shortcut?: string; disabled?: boolean; run: () => void; divider?: boolean };
export function EditorContextMenu({ x, y, actions, onClose }: { x: number; y: number; actions: EditorMenuAction[]; onClose: (restoreFocus?: boolean) => void }) {
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
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !menu.current?.contains(event.target)) close.current(false); };
    const dismiss = () => close.current(false);
    window.addEventListener("pointerdown", outside, true); window.addEventListener("resize", dismiss); window.addEventListener("blur", dismiss);
    return () => { window.removeEventListener("pointerdown", outside, true); window.removeEventListener("resize", dismiss); window.removeEventListener("blur", dismiss); };
  }, []);
  return <div ref={menu} className="cv-context-menu" role="menu" aria-label="Canvas actions" style={{ left: x, top: y }} onContextMenu={event => event.preventDefault()} onKeyDown={event => {
    const buttons = Array.from(menu.current!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')), index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "Escape" || event.key === "Tab") { if (event.key === "Escape") event.preventDefault(); event.stopPropagation(); onClose(); return; }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
  }}>
    {actions.map(action => <button key={action.label} type="button" role="menuitem" className={action.divider ? "cv-context-divider" : undefined} disabled={action.disabled} onClick={() => { onClose(); action.run(); }}><span>{action.label}</span>{action.shortcut && <kbd>{action.shortcut}</kbd>}</button>)}
  </div>;
}
