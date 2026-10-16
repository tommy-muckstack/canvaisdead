/** Geometry shared by the DOM and portable SVG writer. Media stays in separate attributes. */
export type SVGNode = {
  tag: "svg" | "g" | "rect" | "ellipse" | "polygon" | "path" | "line" | "image" | "text" | "tspan" | "defs" | "textPath" | "style";
  attrs: Record<string, string | number>;
  children?: SVGNode[];
  text?: string;
};
export const svgNode = (tag: SVGNode["tag"], attrs: SVGNode["attrs"], children?: SVGNode[], text?: string): SVGNode => ({ tag, attrs, children, text });

const CHUNK = 16_384;
function* escaped(value: string) {
  for (let start = 0; start < value.length;) {
    let end = Math.min(start + CHUNK, value.length);
    // A Blob encodes each string part independently; never split a UTF-16 pair.
    if (end < value.length && /[\uD800-\uDBFF]/.test(value[end - 1]) && /[\uDC00-\uDFFF]/.test(value[end])) end++;
    yield value.slice(start, end).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    start = end;
  }
}
/** No artwork-sized string, including when a page repeats the same large original. */
export function* svgChunks(node: SVGNode): Generator<string> {
  yield `<${node.tag}`;
  for (const [key, value] of Object.entries(node.attrs)) { yield ` ${key}="`; yield* escaped(String(value)); yield '"'; }
  if (node.children === undefined && node.text === undefined) { yield "/>"; return; }
  yield ">";
  if (node.text !== undefined) yield* escaped(node.text);
  for (const child of node.children ?? []) yield* svgChunks(child);
  yield `</${node.tag}>`;
}
/** Convenience for small fixtures/catalog artwork only. User artwork uses DOM nodes or svgBlob. */
export const svgString = (node: SVGNode) => Array.from(svgChunks(node)).join("");
export async function svgBlob(node: SVGNode, signal?: AbortSignal) {
  const parts: BlobPart[] = []; let pending = 0;
  for (const part of svgChunks(node)) {
    signal?.throwIfAborted(); parts.push(part); pending += part.length;
    if (pending >= 1024 * 1024) { pending = 0; await new Promise<void>(resolve => setTimeout(resolve, 0)); }
  }
  signal?.throwIfAborted();
  return new Blob(parts, { type: "image/svg+xml" });
}

/** Keep local definition references scoped when one artwork node is painted repeatedly. */
export function scopeSVGIds(node: SVGNode, prefix: string): SVGNode {
  const attrs = { ...node.attrs };
  if (typeof attrs.id === "string") attrs.id = prefix + "-" + attrs.id;
  if (typeof attrs.href === "string" && attrs.href.startsWith("#")) attrs.href = "#" + prefix + "-" + attrs.href.slice(1);
  return { ...node, attrs, ...(node.children ? { children: node.children.map(child => scopeSVGIds(child, prefix)) } : {}) };
}
