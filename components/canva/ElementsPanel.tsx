"use client";
import { memo, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ELEMENT_ASSETS, ELEMENT_COLORS, ELEMENT_DRAG_TYPE, assetById, elementAssetPreview, searchElements, type ElementAsset, type ElementFilters, type ElementLibrary } from "@/lib/design/elements";
import type { SaveStatus } from "@/lib/local-store";
import { EditorContextMenu } from "./EditorContextMenu";
import { Ic } from "./Ic";

export type ElementsView = ElementFilters & { draft: string; filters: boolean };
export const INITIAL_ELEMENTS_VIEW: ElementsView = { query: "", draft: "", category: "All", color: "", orientation: "", collection: "", filters: false };
const categories = ["Shapes", "Graphics", "Photos", "Videos", "3D", "Forms", "Animations", "Audio", "Sheets", "Tables", "Charts", "Frames", "Grids", "Mockups"];
const categoryIcons = ["shapes", "star", "present", "present", "apps", "edit", "ai", "mic", "grid", "grid", "chart", "full", "grid", "present"];
const unavailable: Record<string, string> = {
  Photos: "The stock photo library is not available yet. You can add an image from your device using Uploads.",
  Videos: "Video elements and playback are not available yet.",
  "3D": "3D elements and editing are not available yet.",
  Forms: "Interactive forms are not available yet.",
  Animations: "Animated elements and animation editing are not available yet.",
  Audio: "Audio elements, playback and timeline editing are not available yet.",
  Sheets: "Spreadsheet elements are not available yet.",
  Tables: "Editable table elements are not available yet.",
  Charts: "Data-driven chart elements are not available yet.",
  Frames: "Media frames and drag-to-fill cropping are not available yet.",
  Grids: "Media grids and collage editing are not available yet.",
  Mockups: "Image placement in product mockups is not available yet.",
};
const AssetPreview = memo(function AssetPreview({ asset }: { asset: ElementAsset }) {
  const html = useMemo(() => elementAssetPreview(asset), [asset]);
  return <span className="cv-asset-preview" aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />;
});
export function ElementsPanel({ view, setView, library, ready, status, onRetry, onStar, onAdd, onUploads }: {
  view: ElementsView; setView: Dispatch<SetStateAction<ElementsView>>; library: ElementLibrary; ready: boolean; status: SaveStatus;
  onRetry: () => boolean; onStar: (id: string) => void; onAdd: (id: string) => void; onUploads: () => void;
}) {
  const search = useRef<HTMLInputElement>(null), region = useRef<HTMLElement>(null), menuTrigger = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState<{ asset: ElementAsset; x: number; y: number } | null>(null);
  const patch = (next: Partial<ElementsView>) => setView(previous => ({ ...previous, ...next }));
  const recent = library.recent.map(assetById).filter((asset): asset is ElementAsset => !!asset);
  const starred = library.starred.map(assetById).filter((asset): asset is ElementAsset => !!asset);
  const special = view.category === "Recently used" || view.category === "Starred";
  const results = searchElements({ ...view, category: special ? "All" : view.category }, view.category === "Recently used" ? recent : view.category === "Starred" ? starred : ELEMENT_ASSETS);
  const home = view.category === "All" && !view.query && !view.color && !view.orientation && !view.collection;
  const changeCategory = (category: string) => {
    patch({ category }); region.current?.closest(".cv-panel")?.scrollTo({ top: 0 });
  };
  const clearSearch = () => { patch({ query: "", draft: "" }); search.current?.focus(); };
  const closeMenu = (restoreFocus = true) => { setMenu(null); if (!restoreFocus) return; const trigger = menuTrigger.current; trigger?.focus({ preventScroll: true }); requestAnimationFrame(() => { if (trigger && !trigger.isConnected && document.activeElement === document.body) search.current?.focus({ preventScroll: true }); }); };
  const showMenu = (asset: ElementAsset, trigger: HTMLButtonElement, point?: { x: number; y: number }) => { menuTrigger.current = trigger; const box = trigger.getBoundingClientRect(); setMenu({ asset, ...point ?? { x: box.left, y: box.bottom } }); };
  const cards = (assets: readonly ElementAsset[]) => <div className="cv-assets">{assets.map(asset => <div className="cv-asset" key={asset.id}>
    <button type="button" className="cv-asset-add" aria-label={`Add ${asset.name.toLocaleLowerCase()}`} title={asset.name} draggable onDragStart={event => { event.dataTransfer.setData(ELEMENT_DRAG_TYPE, asset.id); event.dataTransfer.effectAllowed = "copy"; }} onClick={() => onAdd(asset.id)} onContextMenu={event => { event.preventDefault(); showMenu(asset, event.currentTarget, { x: event.clientX, y: event.clientY }); }} onKeyDown={event => {
      if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) { event.preventDefault(); event.stopPropagation(); showMenu(asset, event.currentTarget); return; }
      if (event.ctrlKey || event.metaKey || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation(); const buttons = [...event.currentTarget.closest(".cv-assets")!.querySelectorAll<HTMLButtonElement>(".cv-asset-add")], index = buttons.indexOf(event.currentTarget);
      const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : Math.max(0, Math.min(buttons.length - 1, index + ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 }[event.key] ?? 0))); buttons[next]?.focus();
    }}><AssetPreview asset={asset} /></button>
    <button type="button" className="cv-asset-more" aria-label={`More about ${asset.name}`} aria-haspopup="menu" aria-expanded={menu?.asset.id === asset.id} onClick={event => { if (menu?.asset.id === asset.id) closeMenu(); else showMenu(asset, event.currentTarget); }}><Ic n="more" s={18} /></button>
    {library.starred.includes(asset.id) && <span className="cv-asset-starred" aria-label="Starred"><Ic n="star" s={12} /></span>}
  </div>)}</div>;
  const section = (title: string, assets: readonly ElementAsset[]) => <section className="cv-asset-section" aria-label={title} key={title}><div className="cv-asset-heading"><h3>{title}</h3><button type="button" aria-label={`See all ${title.toLocaleLowerCase()}`} onClick={() => changeCategory(title)}>See all</button></div>{cards(assets.slice(0, 6))}</section>;
  return <section ref={region} className="cv-elements-panel" aria-label="Elements library" onKeyDown={event => { if (event.key.startsWith("Arrow") && !event.ctrlKey && !event.metaKey) event.stopPropagation(); }}>
    <form role="search" aria-label="Search elements" onSubmit={event => { event.preventDefault(); patch({ query: view.draft.trim() }); }}>
      <div className="cv-psearch"><button type="submit" aria-label="Search elements"><Ic n="search" s={18} /></button><input ref={search} type="search" placeholder="Search elements" aria-label="Search elements" value={view.draft} maxLength={200} onChange={event => patch({ draft: event.currentTarget.value })} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); clearSearch(); } }} />{(view.draft || view.query) && <button type="button" className="cv-clear-search" aria-label="Clear element search" onClick={clearSearch}><Ic n="x" s={16} /></button>}</div>
    </form>
    <div className="cv-element-tabs" role="group" aria-label="Element categories">{["All", ...categories, "Recently used", "Starred"].map(category => <button type="button" key={category} aria-pressed={view.category === category} onClick={() => changeCategory(category)}>{category}</button>)}</div>
    <div className="cv-element-filter-bar"><button type="button" aria-expanded={view.filters} aria-controls="element-search-filters" onClick={() => patch({ filters: !view.filters })}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6" /></svg>Filters{(view.color || view.orientation) ? ` (${Number(!!view.color) + Number(!!view.orientation)})` : ""}</button>{view.collection && <button type="button" aria-label={`Clear collection ${view.collection}`} onClick={() => patch({ collection: "" })}>{view.collection}<Ic n="x" s={12} /></button>}</div>
    <fieldset className="cv-element-filters" id="element-search-filters" hidden={!view.filters}><legend>Filter elements</legend><label>Color<select value={view.color} onChange={event => patch({ color: event.currentTarget.value })}><option value="">Any color</option>{ELEMENT_COLORS.map(color => <option key={color}>{color}</option>)}</select></label><label>Orientation<select value={view.orientation} onChange={event => patch({ orientation: event.currentTarget.value })}><option value="">Any orientation</option>{["Square", "Landscape", "Portrait"].map(value => <option key={value}>{value}</option>)}</select></label><button type="button" onClick={() => patch({ color: "", orientation: "", collection: "" })}>Clear filters</button></fieldset>
    {ready && status !== "saved" && <div className="cv-element-storage" role="status"><p>{status === "conflict" ? "Recent and starred items changed in another tab. Reload to use the saved list." : status === "load-error" ? "Recent and starred items could not be read from this browser. Existing data has not been changed." : "Recent and starred items could not be saved in this browser. Keep this tab open and retry."}</p>{status !== "conflict" && <button type="button" onClick={onRetry}>Retry library storage</button>}</div>}
    {unavailable[view.category] ? <div className="cv-elements-empty" role="status"><h3>{view.category}</h3><p>{unavailable[view.category]}</p>{view.category === "Photos" && <button type="button" className="cv-purple" onClick={onUploads}>Open Uploads</button>}<button type="button" onClick={() => patch({ ...INITIAL_ELEMENTS_VIEW })}>Browse available elements</button></div> : home ? <>
      {recent.length > 0 && section("Recently used", recent)}
      <h3>Browse categories</h3><div className="cv-cats cv-element-categories">{categories.map((category, index) => <button type="button" key={category} onClick={() => changeCategory(category)}><span><Ic n={categoryIcons[index]} s={28} /></span><small>{category}</small></button>)}</div>
      {section("Shapes", ELEMENT_ASSETS.filter(asset => asset.category === "Shapes"))}{section("Graphics", ELEMENT_ASSETS.filter(asset => asset.category === "Graphics"))}
    </> : <>
      <p className="cv-elements-count" role="status">{results.length} {results.length === 1 ? "element" : "elements"}{view.query ? ` for “${view.query}”` : ""}</p>
      {!results.length ? <div className="cv-elements-empty"><h3>{special && !view.query && !view.color && !view.orientation && !view.collection ? view.category === "Starred" ? "No starred elements yet" : "No recently used elements yet" : "No elements found"}</h3><p>{view.category === "Starred" ? "Use an element's More menu to star it for later." : view.category === "Recently used" ? "Elements you add appear here." : "Try a different keyword or clear your filters."}</p><button type="button" onClick={() => { patch({ ...INITIAL_ELEMENTS_VIEW }); search.current?.focus(); }}>Browse elements</button></div> : view.category === "All" ? ["Shapes", "Graphics"].map(category => { const items = results.filter(asset => asset.category === category); return items.length ? section(category, items) : null; }) : cards(results)}
    </>}
    {menu && <EditorContextMenu x={menu.x} y={menu.y} label={`Actions for ${menu.asset.name}`} trigger={menuTrigger} onClose={closeMenu} actions={[
      { label: library.starred.includes(menu.asset.id) ? "Unstar" : "Star", disabled: !ready || status === "load-error" || status === "conflict", run: () => onStar(menu.asset.id) },
      { label: "Find similar", run: () => { const query = menu.asset.tags.split(" ")[0]; patch({ ...INITIAL_ELEMENTS_VIEW, query, draft: query, category: menu.asset.category }); } },
      { label: "View collection", run: () => patch({ ...INITIAL_ELEMENTS_VIEW, collection: menu.asset.collection }) },
    ]} />}
  </section>;
}
