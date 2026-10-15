"use client";
import { useState } from "react";
import type { El } from "@/lib/design/types";
import { elHeight, reflowTextElement, textDecoration, type Measure } from "@/lib/design/ops";
import { letterSpacingPixels } from "@/lib/design/text-spacing";

export function TextEditor({ element, scale, measure, onCommit }: { element: El; scale: number; measure: Measure; onCommit: (text: string) => void }) {
  const [text, setText] = useState(element.text ?? "");
  const preview = reflowTextElement(element, { text: text || " " }, measure), height = elHeight(preview, measure) * scale;
  return <textarea autoFocus aria-label="Edit text" className="cv-text" value={text} onChange={event => setText(event.currentTarget.value)}
    onBlur={() => onCommit(text || " ")} onKeyDown={event => { if (event.key === "Escape" && !event.nativeEvent.isComposing) event.currentTarget.blur(); }}
    style={{ left: preview.x * scale, top: preview.y * scale, width: preview.w * scale, height: Math.max(40, height + 8),
      transform: `rotate(${preview.rotation}deg)`, transformOrigin: `50% ${height / 2}px`, opacity: preview.opacity,
      fontSize: (preview.fontSize ?? 32) * scale, fontFamily: preview.fontFamily, fontWeight: preview.fontWeight, fontStyle: preview.italic ? "italic" : "normal",
      textDecoration: textDecoration(preview), textAlign: preview.align, color: preview.fill, lineHeight: preview.lineHeight ?? 1.2, letterSpacing: letterSpacingPixels(preview) * scale }} />;
}
