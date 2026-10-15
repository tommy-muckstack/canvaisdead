import { BP } from "@/lib/basepath";

/** The owner's tombstone mark, recolored teal/blue/purple. Adjacent text names the brand. */
export function BrandMark({ size = 28 }: { size?: number }) {
  return <img src={`${BP}/brand/mark.png`} width={size} height={size} alt="" aria-hidden="true" draggable={false} style={{ display: "inline-block", flexShrink: 0, verticalAlign: "middle", objectFit: "contain" }} />;
}
