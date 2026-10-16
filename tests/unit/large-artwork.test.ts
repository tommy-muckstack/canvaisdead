import { constants } from "node:buffer";
import { createHash } from "node:crypto";
import { Writable } from "node:stream";
import { createElement } from "react";
import { renderToPipeableStream } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ArtworkElements, DesignArtwork, SVGArtwork } from "@/components/canva/Artwork";
import { blankDesign, makeEl, toSVG } from "@/lib/design/ops";
import { isDesignLibrary } from "@/lib/design/validate";
import { layerThumbnailNode } from "@/lib/design/layers";
import { DEFAULT_DOWNLOAD, exportDesign } from "@/lib/design/download";
import { designPages } from "@/lib/design/pages";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_PIXELS } from "@/lib/uploads/model";
import { zipBlobs } from "@/lib/design/zip";
import { originalPNG } from "../fixtures/png";

describe("original-image artwork above the JavaScript string ceiling", () => {
  it("renders the editor, page and grouped-layer trees, then exports a complete SVG and ZIP without aggregation", async () => {
    const png = originalPNG(4096, 4096), src = `data:image/png;base64,${png.toString("base64")}`;
    expect(png.length).toBeLessThanOrEqual(MAX_UPLOAD_BYTES); expect(4096 * 4096).toBeLessThan(MAX_UPLOAD_PIXELS);
    const design = blankDesign({ w: 800, h: 600 });
    design.els = Array.from({ length: 8 }, (_, i) => makeEl("image", design, { src, x: i * 10, groupPath: ["large-group"] }));
    expect(isDesignLibrary([design])).toBe(true); expect(src.length * 8).toBeGreaterThan(constants.MAX_STRING_LENGTH);

    // Fizz streams the actual React components into a bounded consumer. This verifies
    // markup/attribute construction, not browser decoding, paint or native IndexedDB.
    let bytes = 0, images = 0, tail = "";
    await new Promise<void>((resolve, reject) => {
      const sink = new Writable({ write(chunk: Buffer, _encoding, done) {
        bytes += chunk.length;
        for (let offset = 0; offset < chunk.length; offset += 65536) {
          const text = tail + chunk.subarray(offset, offset + 65536).toString();
          images += (text.match(/<image[ >]/g) ?? []).length; tail = text.slice(-6);
        }
        done();
      } });
      sink.on("finish", resolve); sink.on("error", reject);
      const stream = renderToPipeableStream(createElement("main", null,
        createElement(DesignArtwork, { design }),
        createElement("svg", null, createElement(ArtworkElements, { elements: design.els })),
        createElement(SVGArtwork, { node: layerThumbnailNode(design.els) }),
      ), { onShellReady: () => stream.pipe(sink), onError: reject });
    });
    expect(images).toBe(24); expect(bytes).toBeGreaterThan(src.length * 24);

    const result = await exportDesign(design, { ...DEFAULT_DOWNLOAD, format: "svg", pageIds: [designPages(design)[0].id] });
    expect(result.blob.size).toBeGreaterThan(constants.MAX_STRING_LENGTH);
    expect(result.blob.type).toBe("image/svg+xml");
    // Independent Node digest over the original source bytes between small markup
    // fragments; never form the expected or actual page as a single string/buffer.
    const marker = "ORIGINAL_SOURCE_MARKER", parts = toSVG({ ...design, els: design.els.map(e => ({ ...e, src: marker })) }).split(marker);
    const expected = createHash("sha256");
    for (const [index, part] of parts.entries()) { expected.update(part); if (index < parts.length - 1) expected.update(src); }
    const actual = createHash("sha256"), reader = result.blob.stream().getReader();
    try { while (true) { const part = await reader.read(); if (part.done) break; actual.update(part.value); } } finally { reader.releaseLock(); }
    expect(actual.digest("hex")).toBe(expected.digest("hex"));
    expect(await result.blob.slice(-6).text()).toBe("</svg>");

    const noAggregate = vi.spyOn(result.blob, "arrayBuffer").mockRejectedValue(Error("Whole-file buffer is forbidden"));
    const zip = await zipBlobs([{ name: "large.svg", data: result.blob }, { name: "small.svg", data: new Blob(["<svg/>"]) }]);
    expect(zip.size).toBeGreaterThan(result.blob.size); expect(noAggregate).not.toHaveBeenCalled();
    const end = new DataView(await zip.slice(-22).arrayBuffer());
    expect(end.getUint32(0, true)).toBe(0x06054b50); expect(end.getUint16(10, true)).toBe(2);
    const directory = new DataView(await zip.slice(end.getUint32(16, true), end.getUint32(16, true) + 46).arrayBuffer());
    expect(directory.getUint32(0, true)).toBe(0x02014b50); expect(directory.getUint32(24, true)).toBe(result.blob.size);
    expect(design.els.every(e => e.src === src)).toBe(true);
  }, 120_000);
});
