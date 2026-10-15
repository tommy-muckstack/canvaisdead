"use client";
import { useState } from "react";
export function FootCols({ cols, base }: { cols: [string, string[]][]; base: string }) {
  const [open, setOpen] = useState<string | null>(null);
  return <div className="cols">{cols.map(([t, ls]) => <div key={t} className={open === t ? "open" : ""}><h5 onClick={() => setOpen(open === t ? null : t)}>{t}<i /></h5>{ls.map(l => <a key={l} href={l === "Pricing" ? base + "/#pricing" : "#"}>{l}</a>)}</div>)}</div>;
}
