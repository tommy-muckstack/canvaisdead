"use client";
import { memo, useEffect, useMemo, useState } from "react";
import type { CanvasDesign } from "@/lib/design/types";
import { toSVG, type Measure } from "@/lib/design/ops";
import { canvasMeasure } from "@/lib/design/render";
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
  const html = useMemo(() => toSVG(design, measure).replace(/width="\d+" height="\d+"/, 'width="100%" height="100%"'), [design, measure]);
  return <div className="cv-slide-preview" role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: html }} />;
});
