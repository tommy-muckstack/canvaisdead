"use client";
import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import type { Rect } from "@/lib/design/ops";
import { floatingToolbarPosition } from "@/lib/design/floating-toolbar";

export function FloatingToolbar({ bounds, scale, canvas, stage, group = false, children }: {
  bounds: Rect; scale: number; canvas: RefObject<SVGSVGElement | null>; stage: RefObject<HTMLDivElement | null>; group?: boolean; children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { x, y, w, h } = bounds;
  useLayoutEffect(() => {
    const toolbar = ref.current, page = canvas.current, area = stage.current;
    if (!toolbar || !page || !area) return;
    const editor = area.closest(".cv");
    const topControls = Array.from(editor?.querySelectorAll<HTMLElement>(".cv-ctx, .cv-page-actions") ?? []);
    const bottomControls = Array.from(area.querySelectorAll<HTMLElement>(".cv-page-dock, .cv-zoom, .cv-notes"));
    const update = () => {
      const a = area.getBoundingClientRect(), p = page.getBoundingClientRect(), view = window.visualViewport;
      const left = Math.max(a.left, view?.offsetLeft ?? 0) + 8, right = Math.min(a.right, (view?.offsetLeft ?? 0) + (view?.width ?? window.innerWidth)) - 8;
      let top = Math.max(a.top, view?.offsetTop ?? 0) + 8, bottom = Math.min(a.bottom, (view?.offsetTop ?? 0) + (view?.height ?? window.innerHeight)) - 8;
      for (const control of topControls) { const box = control.getBoundingClientRect(); if (box.width && box.height) top = Math.max(top, box.bottom + 8); }
      for (const control of bottomControls) { const box = control.getBoundingClientRect(); if (box.width && box.height) bottom = Math.min(bottom, box.top - 8); }
      toolbar.style.maxWidth = `${Math.max(1, right - left)}px`;
      const size = toolbar.getBoundingClientRect();
      const point = floatingToolbarPosition({ x: p.left + x * scale, y: p.top + y * scale, w: w * scale, h: h * scale }, { w: size.width, h: size.height }, { x: left, y: top, w: Math.max(0, right - left), h: Math.max(size.height, bottom - top) });
      toolbar.style.left = `${point.x - p.left}px`; toolbar.style.top = `${point.y - p.top}px`;
      toolbar.style.visibility = "visible";
    };
    update();
    const observer = new ResizeObserver(update);
    for (const node of [toolbar, page, area, ...topControls, ...bottomControls]) observer.observe(node);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { capture: true, passive: true });
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      observer.disconnect(); window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true);
      window.visualViewport?.removeEventListener("resize", update); window.visualViewport?.removeEventListener("scroll", update);
    };
  }, [x, y, w, h, scale, canvas, stage]);
  return <div ref={ref} className={`cv-float${group ? " cv-group-float" : ""}`} role="group" aria-label={group ? "Group actions" : "Element actions"} data-testid={group ? "group-toolbar" : "float-toolbar"} style={{ visibility: "hidden" }} onPointerDown={event => event.stopPropagation()}>{children}</div>;
}
