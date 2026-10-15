"use client";
import { useEffect, useRef } from "react";
import { imageCropZoom } from "@/lib/design/image-crop";
import type { ImageCropSession } from "./useImageCrop";

export function ImageCropPanel({ crop, onDone, onCancel }: { crop: ImageCropSession; onDone: () => void; onCancel: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null), preview = crop.preview;
  useEffect(() => { heading.current?.focus(); }, []);
  const ratios = [["1:1", 1], ["4:3", 4 / 3], ["3:4", 3 / 4], ["16:9", 16 / 9], ["9:16", 9 / 16], ["4:5", 4 / 5], ["5:4", 5 / 4]] as const;
  return <section className="cv-crop-panel" aria-label="Image crop settings" onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onCancel(); } }}>
    <h3 ref={heading} tabIndex={-1}>Crop</h3>
    {crop.error ? <div role="alert"><p>{crop.error}</p><button type="button" className="cv-outl" onClick={crop.retry}>Retry image</button></div> : !preview ? <p role="status">Opening image…</p> : <>
      <label className="cv-crop-label">Aspect ratio<select aria-label="Crop aspect ratio" value={crop.ratioChoice} onChange={event => crop.setRatio(event.target.value)}>
        <option value="free">Freeform</option><option value="original">Original</option>
        {ratios.map(([label, ratio]) => <option key={label} value={ratio}>{label}</option>)}
      </select></label>
      <label className="cv-crop-label">Zoom <output>{Math.round(imageCropZoom(preview) * 100)}%</output><input aria-label="Crop zoom" type="range" min={1} max={crop.zoomLimit} step={.01} value={imageCropZoom(preview)} onChange={event => crop.setZoom(Number(event.target.value))} /></label>
      <p className="cv-crop-hint">Drag the image to reposition it. Drag the crop handles to change the visible area.</p>
      <button type="button" className="cv-outl" onClick={crop.reset}>Reset crop</button>
    </>}
    <div className="cv-crop-buttons"><button type="button" className="cv-outl" onClick={onCancel}>Cancel</button><button type="button" className="cv-purple" disabled={!preview || !!crop.error} onClick={onDone}>Done</button></div>
  </section>;
}
