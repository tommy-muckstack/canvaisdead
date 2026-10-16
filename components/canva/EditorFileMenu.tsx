"use client";
import { useRef, useState } from "react";
import { EditorContextMenu } from "./EditorContextMenu";
import { Ic } from "./Ic";

export function EditorFileMenu({ canCreate, copying, onCreate, onCopy, onRename, onDownload }: {
  canCreate: boolean; copying: boolean; onCreate: () => void; onCopy: () => void; onRename: () => void; onDownload: (trigger: HTMLButtonElement) => void;
}) {
  const button = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; last: boolean } | null>(null);
  const open = (last = false) => { const box = button.current!.getBoundingClientRect(); setMenu({ x: box.left, y: box.bottom + 4, last }); };
  const close = (restoreFocus = true) => { setMenu(null); if (restoreFocus) button.current?.focus({ preventScroll: true }); };
  return <>
    <button ref={button} type="button" className="cv-tb t" aria-haspopup="menu" aria-expanded={!!menu} onClick={() => menu ? close() : open()} onKeyDown={event => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); event.stopPropagation(); open(event.key === "ArrowUp"); }
    }}>File</button>
    {menu && <EditorContextMenu {...menu} label="File" className="cv-file-menu" trigger={button} initialFocus={menu.last ? "last" : "first"} onClose={close} actions={[
      { label: "Create a new design", icon: <Ic n="plus" s={18} />, disabled: !canCreate, run: onCreate },
      { label: "Make a copy", icon: <Ic n="copy" s={18} />, disabled: !canCreate || copying, run: onCopy },
      { label: "Rename", icon: <Ic n="edit" s={18} />, run: onRename },
      { label: "Download", icon: <Ic n="dl" s={18} />, divider: true, run: () => { if (button.current) onDownload(button.current); } },
    ]} />}
  </>;
}
