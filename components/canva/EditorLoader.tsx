"use client";
import Link from "next/link";
import { useLocal } from "@/lib/useLocal";
import type { Design } from "@/lib/design/types";
import { Editor } from "./Editor";
export function EditorLoader({ uid, id }: { uid: string; id: string }) {
  const [designs, setDesigns, ready] = useLocal<Design[]>(uid, "designs", []);
  if (!ready) return <div className="cd" aria-busy>Loading…</div>;
  const d = designs.find(x => x.id === id);
  if (!d) return <div className="cd"><h2>That design isn't in this browser.</h2><p className="ids-muted">Designs are saved in your browser. <Link href="/app">Back to your designs</Link></p></div>;
  return <Editor key={d.id} initial={d} onSave={nd => setDesigns(p => p.map(x => (x.id === nd.id ? nd : x)))} />;
}
