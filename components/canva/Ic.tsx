const P: Record<string, string> = {
  timer: "M9 2h6M12 6a8 8 0 100 16 8 8 0 000-16zM12 10v5l3 2M18 7l2-2", saved: "M5 3h12l3 3v15H4V3zM8 3v6h8V3M8 21v-8h8v8M10 16l2 2 3-3", unsaved: "M12 3l10 18H2zM12 9v5M12 17h.01", chevl: "M14 7l-5 5 5 5",
  copy: "M9 8h11v13H9zM5 16H3V3h11v2", trash: "M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7",
  plus: "M12 5v14M5 12h14", home: "M4 11l8-7 8 7v9h-5v-6H9v6H4z", folder: "M3 6h7l2 2h9v11H3z", tpl: "M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z", crown: "M4 8l4 4 4-7 4 7 4-4-2 11H6z",
  print: "M7 9V4h10v5M5 9h14v8H5zM8 14h8v6H8z", more: "M5 12h.01M12 12h.01M19 12h.01", bell: "M6 17V11a6 6 0 0112 0v6l2 2H4zM10 21h4", search: "M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-5-5", sidebar: "M4 5h16v14H4zM9 5v14",
  ai: "M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z", shapes: "M5 5h6v6H5zM15 15a3 3 0 106 0 3 3 0 00-6 0zM6 20l3-6 3 6z", text: "M5 6V4h14v2M12 4v16M9 20h6", up: "M12 16V4M7 9l5-5 5 5M5 20h14", tools: "M4 19l2-6L17 2l5 5-11 11-7 1zM14 5l5 5M3 22h17", apps: "M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z",
  mic: "M12 4a3 3 0 013 3v5a3 3 0 01-6 0V7a3 3 0 013-3zM6 11a6 6 0 0012 0M12 17v3", chev: "M7 10l5 5 5-5", chevr: "M10 7l5 5-5 5", undo: "M9 5L4 10l5 5M4 10h9a7 7 0 017 7", redo: "M15 5l5 5-5 5M20 10h-9a7 7 0 00-7 7", cloud: "M7 18a4 4 0 010-8 5 5 0 019.6-1A4.5 4.5 0 0117 18z",
  chart: "M5 20V10M12 20V4M19 20v-7", comment: "M4 5h16v11H9l-5 4z", lock: "M6 11h12v9H6zM8 11V8a4 4 0 018 0v3", link: "M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1", dl: "M12 4v12M7 11l5 5 5-5M5 20h14", present: "M4 5h16v11H4zM12 16v4M8 20h8", globe: "M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18", x: "M6 6l12 12M18 6L6 18",
  gear: "M12 9a3 3 0 100 6 3 3 0 000-6zM4 12h2M18 12h2M12 4v2M12 18v2", user: "M12 4a4 4 0 100 8 4 4 0 000-8zM4 20a8 8 0 0116 0", grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z", full: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5", help: "M9 9a3 3 0 116 0c0 2-3 2-3 4M12 17h.01", star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z", edit: "M4 20l4-1 11-11-3-3L5 16z",
};
export function Ic({ n, s = 20, w = 1.8 }: { n: string; s?: number; w?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={P[n] ?? P.more} /></svg>;
}
