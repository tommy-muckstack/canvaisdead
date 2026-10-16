import type { El } from "./types";
import { elementSVGNode, type Measure } from "./ops";
import { svgBlob, svgNode } from "./svg-tree";
import { BP } from "../basepath";

let bundledFont: Promise<string> | undefined;
async function fontCSS(e: El) {
  if (!e.fontFamily?.includes("IsDead Plus Jakarta Sans")) return "";
  bundledFont ??= (async () => {
    const response = await fetch(`${BP}/fonts/PlusJakartaSans-Variable.woff2`);
    if (!response.ok) throw Error("The bundled font could not be loaded. Reconnect and try the download again, or download SVG.");
    const data = new Uint8Array(await response.arrayBuffer());
    if (data.length > 1_000_000) throw Error("The bundled font is too large to embed.");
    let binary = ""; for (const byte of data) binary += String.fromCharCode(byte);
    return `@font-face{font-family:"IsDead Plus Jakarta Sans";src:url(data:font/woff2;base64,${btoa(binary)}) format("woff2");font-weight:100 900;font-style:normal}`;
  })().catch(error => { bundledFont = undefined; throw error; });
  return bundledFont;
}
/** Use the browser's shaped text paths in PNG/JPG/PDF as well as the editor. */
export async function drawCurvedText(ctx: CanvasRenderingContext2D, e: El, scale: number, width: number, height: number, measure: Measure) {
  const node = elementSVGNode(e, measure); if (!node) return;
  const css = await fontCSS(e), svg = svgNode("svg", { xmlns: "http://www.w3.org/2000/svg", width, height, viewBox: `0 0 ${width / scale} ${height / scale}` }, [...(css ? [svgNode("style", {}, undefined, css)] : []), node]);
  const url = URL.createObjectURL(await svgBlob(svg));
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(Error("This browser could not render curved text. Download SVG or update your browser.")); image.src = url;
    });
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(image, 0, 0); ctx.restore();
  } finally { URL.revokeObjectURL(url); }
}
