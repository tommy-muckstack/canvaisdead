import { PDFName, PDFString, type PDFDocument } from "pdf-lib";
import type { Page } from "./types";
import { selectionBounds } from "./selection";
import { validElementLink } from "./links";
import type { Measure } from "./ops";

/** Add annotations after every selected page exists, so destinations use PDF refs. */
export function addPDFLinks(pdf: PDFDocument, pages: Page[], width: number, height: number, measure: Measure) {
  const output = pdf.getPages(), destinations = new Map(pages.map((page, index) => [page.id, output[index].ref]));
  pages.forEach((page, index) => {
    const target = output[index], sx = target.getWidth() / width, sy = target.getHeight() / height;
    for (const element of page.els) {
      const link = element.link;
      if (!validElementLink(link) || (link.kind === "page" && !destinations.has(link.pageId))) continue;
      const box = selectionBounds([element], measure)!;
      const left = Math.max(0, box.x), right = Math.min(width, box.x + box.w), top = Math.max(0, box.y), bottom = Math.min(height, box.y + box.h);
      if (left >= right || top >= bottom) continue;
      const annotation = pdf.context.obj({
        Type: "Annot", Subtype: "Link", Rect: [left * sx, (height - bottom) * sy, right * sx, (height - top) * sy], Border: [0, 0, 0],
        ...(link.kind === "url" ? { A: { Type: "Action", S: "URI", URI: PDFString.of(link.url) } } :
          { Dest: [destinations.get(link.pageId)!, PDFName.of("Fit")] }),
      });
      target.node.addAnnot(pdf.context.register(annotation));
    }
  });
}
