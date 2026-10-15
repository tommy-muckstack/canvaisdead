import type { Design, SizePreset } from "./types";

export const DESIGN_UNITS = ["px", "in", "mm", "cm"] as const;
export type DesignUnit = typeof DESIGN_UNITS[number];
// Use the same 96 px/in coordinate system as local PDF export.
const PIXELS_PER_UNIT: Record<DesignUnit, number> = { px: 1, in: 96, mm: 96 / 25.4, cm: 96 / 2.54 };
export const MIN_DESIGN_SIDE = 40, MAX_DESIGN_SIDE = 8000, MAX_DESIGN_AREA = 25_000_000;
export type DimensionDraft = { width: string; height: string; unit: DesignUnit; ratio: number | null };
type SizeResult = { size: { w: number; h: number }; error?: never } | { size?: never; error: string };

export function dimensionNumber(value: string): number | null {
  const text = value.trim();
  if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text)) return null;
  const number = Number(text.replace(",", "."));
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function customSize(width: string, height: string, unit: DesignUnit): SizeResult {
  const w = dimensionNumber(width), h = dimensionNumber(height);
  if (w === null || h === null) return { error: "Enter a positive width and height." };
  const size = { w: Math.round(w * PIXELS_PER_UNIT[unit]), h: Math.round(h * PIXELS_PER_UNIT[unit]) };
  if (!Number.isFinite(size.w) || !Number.isFinite(size.h) || size.w < MIN_DESIGN_SIDE || size.h < MIN_DESIGN_SIDE || size.w > MAX_DESIGN_SIDE || size.h > MAX_DESIGN_SIDE)
    return { error: "Width and height must each be between 40 and 8,000 pixels." };
  if (size.w * size.h > MAX_DESIGN_AREA) return { error: "Reduce the width or height to keep the design within 25 million pixels." };
  return { size };
}

const formatDimension = (value: number) => Number(value.toFixed(6)).toString();
export function changeDimensionUnit(draft: DimensionDraft, unit: DesignUnit): DimensionDraft {
  const convert = (value: string) => {
    const number = dimensionNumber(value);
    return number === null ? value : formatDimension(number * PIXELS_PER_UNIT[draft.unit] / PIXELS_PER_UNIT[unit]);
  };
  return { ...draft, unit, width: convert(draft.width), height: convert(draft.height) };
}
export function editDimension(draft: DimensionDraft, field: "width" | "height", value: string): DimensionDraft {
  const next = { ...draft, [field]: value }, number = dimensionNumber(value);
  if (draft.ratio !== null && number !== null) {
    const other = field === "width" ? number / draft.ratio : number * draft.ratio;
    if (Number.isFinite(other) && other > 0) next[field === "width" ? "height" : "width"] = formatDimension(other);
  }
  return next;
}
export function toggleDimensionRatio(draft: DimensionDraft): DimensionDraft {
  const w = dimensionNumber(draft.width), h = dimensionNumber(draft.height);
  const ratio = w !== null && h !== null ? w / h : null;
  return { ...draft, ratio: draft.ratio !== null || ratio === null || !Number.isFinite(ratio) || ratio <= 0 ? null : ratio };
}
export function swapDimensions(draft: DimensionDraft): DimensionDraft {
  return { ...draft, width: draft.height, height: draft.width, ratio: draft.ratio === null ? null : 1 / draft.ratio };
}

const searchable = (value: string) => value.toLowerCase().replace(/(\d)\s*[x×]\s*(?=\d)/g, "$1 ").trim();
export function searchSizePresets(presets: readonly SizePreset[], query: string): SizePreset[] {
  const terms = searchable(query).split(/\s+/).filter(Boolean);
  return presets.filter(size => {
    const haystack = searchable(`${size.label} ${size.hint} ${size.w} ${size.h} px`);
    return terms.every(term => haystack.includes(term));
  });
}

/** Reuse dimensions from real local designs; never invent recent activity. */
export function recentDesignSizes(designs: readonly Design[]): { w: number; h: number }[] {
  const seen = new Set<string>(), sizes: { w: number; h: number }[] = [];
  for (const design of [...designs].sort((a, b) => b.updatedAt - a.updatedAt)) {
    if (design.trashedAt !== undefined) continue;
    const result = customSize(String(design.w), String(design.h), "px");
    if (!result.size) continue;
    const key = `${result.size.w}:${result.size.h}`;
    if (seen.has(key)) continue;
    seen.add(key); sizes.push(result.size);
    if (sizes.length === 6) break;
  }
  return sizes;
}
