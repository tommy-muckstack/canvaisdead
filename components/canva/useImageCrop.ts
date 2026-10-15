"use client";
import { useEffect, useState } from "react";
import type { El } from "@/lib/design/types";
import { beginImageCrop, imageCropZoom, ratioImageCrop, resetImageCrop, zoomImageCrop } from "@/lib/design/image-crop";

type Session = { original: El; initial: El; preview: El; ratio: number | null; ratioChoice: string; zoomLimit: number };
const sameCrop = (a: El, b: El) => ["x", "y", "w", "h"].every(key => a[key as keyof El] === b[key as keyof El]) && JSON.stringify(a.imageCrop) === JSON.stringify(b.imageCrop);
export function useImageCrop(element: El | null) {
  const [session, setSession] = useState<Session | null>(null), [failure, setFailure] = useState<{ original: El; message: string } | null>(null), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!element) { setSession(null); setFailure(null); return; }
    let active = true;
    const fail = () => { if (active) setFailure({ original: element, message: "This image could not be opened for cropping. The original is unchanged." }); };
    if (!/^data:image\/(?:png|jpeg|webp|gif|avif);base64,/i.test(element.src ?? "")) { fail(); return; }
    const image = new Image();
    image.onload = () => {
      if (!active) return;
      try { const preview = beginImageCrop(element, image.naturalWidth, image.naturalHeight); setSession({ original: element, initial: preview, preview, ratio: null, ratioChoice: "free", zoomLimit: Math.max(10, imageCropZoom(preview)) }); setFailure(null); }
      catch { fail(); }
    };
    image.onerror = fail; image.src = element.src!;
    return () => { active = false; image.onload = null; image.onerror = null; };
  }, [element, attempt]);
  const current = session?.original === element ? session : null, error = failure?.original === element ? failure.message : null;
  const change = (update: (preview: El) => El, ratio?: number | null, ratioChoice?: string) => setSession(previous => {
    if (!previous || previous.original !== element) return previous;
    const preview = update(previous.preview);
    return { ...previous, preview, zoomLimit: Math.max(previous.zoomLimit, imageCropZoom(preview)), ratio: ratio === undefined ? previous.ratio : ratio, ratioChoice: ratioChoice ?? previous.ratioChoice };
  });
  return {
    preview: current?.preview ?? null, ratio: current?.ratio ?? null, ratioChoice: current?.ratioChoice ?? "free", zoomLimit: current?.zoomLimit ?? 10, error, changed: !!current && !sameCrop(current.initial, current.preview),
    setPreview: (preview: El) => change(() => preview),
    setRatio: (choice: string) => { const ratio = choice === "free" ? null : choice === "original" && current ? current.preview.imageCrop!.sourceW / current.preview.imageCrop!.sourceH : Number(choice); change(preview => ratio === null ? preview : ratioImageCrop(preview, ratio), ratio, choice); },
    setZoom: (zoom: number) => change(preview => zoomImageCrop(preview, zoom, current?.zoomLimit)),
    reset: () => change(resetImageCrop, null, "free"),
    retry: () => { setFailure(null); setAttempt(value => value + 1); },
  };
}
export type ImageCropSession = ReturnType<typeof useImageCrop>;
