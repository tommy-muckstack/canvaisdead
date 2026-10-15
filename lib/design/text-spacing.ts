import type { El } from "./types";

export const LETTER_SPACING_MIN = -0.2;
export const LETTER_SPACING_MAX = 0.8;
export const LINE_SPACING_MIN = 0.5;
export const LINE_SPACING_MAX = 2.5;
export const validLetterSpacing = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= LETTER_SPACING_MIN && value <= LETTER_SPACING_MAX;
export const validTextAnchor = (value: unknown): value is NonNullable<El["textAnchor"]> => value === "start" || value === "middle" || value === "end";
export const textAnchorFraction = (e: Pick<El, "textAnchor">) => e.textAnchor === "end" ? 1 : e.textAnchor === "middle" ? 0.5 : 0;
export const letterSpacingPixels = (e: Pick<El, "fontSize" | "letterSpacingEm">) => (e.fontSize ?? 32) * (e.letterSpacingEm ?? 0);
