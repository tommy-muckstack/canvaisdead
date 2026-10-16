"use client";
import { memo, useEffect, useState } from "react";
import type { CanvasDesign } from "@/lib/design/types";
import { type Measure } from "@/lib/design/ops";
import { canvasMeasure } from "@/lib/design/render";
import { DesignArtwork } from "./Artwork";
export const SlidePreview = memo(function SlidePreview({ design, label }: { design: CanvasDesign; label: string }) {
  const [measure, setMeasure] = useState<Measure>();
  useEffect(() => {
    let active = true; const update = () => {
      if (!active) return;
      const ctx = document.createElement("canvas").getContext("2d");
      if (ctx) setMeasure(() => canvasMeasure(ctx));
    };
    void document.fonts?.ready.then(update); document.fonts?.addEventListener("loadingdone", update);
    return () => { active = false; document.fonts?.removeEventListener("loadingdone", update); };
  }, []);
  return <div className="cv-slide-preview" role="img" aria-label={label}><DesignArtwork design={design} measure={measure} /></div>;
});
