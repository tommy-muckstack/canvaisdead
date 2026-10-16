"use client";
import { useSyncExternalStore } from "react";
import { createFontMeasureStore } from "@/lib/design/font-measure";

const store = createFontMeasureStore(
  () => typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d"),
  () => typeof document === "undefined" ? undefined : document.fonts,
);
const inactive = () => () => {};
export function useTextMeasure(enabled = true) {
  return useSyncExternalStore(enabled ? store.subscribe : inactive, enabled ? store.getSnapshot : store.getServerSnapshot, store.getServerSnapshot);
}
