import type { Design, El } from "./types";

const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
function isElement(value: unknown): value is El {
  if (!record(value)) return false;
  return typeof value.id === "string" &&
    ["rect", "ellipse", "triangle", "star", "line", "text", "image"].includes(value.type as string) &&
    ["x", "y", "w", "h", "rotation", "opacity", "strokeWidth", "radius"].every(key => finite(value[key])) &&
    ["fill", "stroke"].every(key => typeof value[key] === "string") &&
    ["text", "fontFamily", "src"].every(key => value[key] === undefined || typeof value[key] === "string") &&
    ["fontSize", "fontWeight", "lineHeight"].every(key => value[key] === undefined || finite(value[key])) &&
    ["locked", "italic", "underline", "strikethrough"].every(key => value[key] === undefined || typeof value[key] === "boolean") &&
    (value.align === undefined || ["left", "center", "right"].includes(value.align as string));
}
export function isDesignLibrary(value: unknown): value is Design[] {
  return Array.isArray(value) && value.every(design => record(design) &&
    typeof design.id === "string" && typeof design.name === "string" && typeof design.bg === "string" &&
    finite(design.w) && design.w > 0 && finite(design.h) && design.h > 0 && finite(design.updatedAt) &&
    Array.isArray(design.els) && design.els.every(isElement));
}
