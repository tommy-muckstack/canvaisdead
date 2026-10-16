"use client";
import { memo } from "react";
import type { CanvasDesign } from "@/lib/design/types";
import { DesignArtwork } from "./Artwork";
export const SlidePreview = memo(function SlidePreview({ design, label }: { design: CanvasDesign; label: string }) {
  return <div className="cv-slide-preview" role="img" aria-label={label}><DesignArtwork design={design} /></div>;
});
