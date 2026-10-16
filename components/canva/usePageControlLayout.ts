"use client";
import { useLayoutEffect, type RefObject } from "react";

/** Reserve separate rows for formatting and page actions, including wrapped mobile controls. */
export function usePageControlLayout(stage: RefObject<HTMLDivElement | null>, formatting: RefObject<HTMLDivElement | null>, actions: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const area = stage.current, toolbar = formatting.current, row = actions.current;
    if (!area || !toolbar || !row) return;
    const update = () => {
      const workspace = area.getBoundingClientRect(), tools = toolbar.getBoundingClientRect();
      const top = Math.max(12, tools.height ? tools.bottom - workspace.top + 12 : 12);
      const padding = top + row.getBoundingClientRect().height + 16;
      area.style.setProperty("--cv-page-actions-top", `${top + area.scrollTop}px`);
      area.style.setProperty("--cv-controls-height", `${padding}px`);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(area); observer.observe(toolbar); observer.observe(row);
    window.addEventListener("resize", update);
    area.addEventListener("scroll", update, { passive: true });
    return () => { observer.disconnect(); window.removeEventListener("resize", update); area.removeEventListener("scroll", update); };
  }, [stage, formatting, actions]);
}
