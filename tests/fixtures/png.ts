import { deflateSync } from "node:zlib";
import { crc32 } from "@/lib/design/zip";

/** Complete RGB PNG with filter 0 and stored DEFLATE blocks; intentionally uncompressed. */
export function originalPNG(width: number, height: number) {
  const chunk = (type: string, bytes: Buffer) => {
    const payload = Buffer.concat([Buffer.from(type), bytes]), length = Buffer.alloc(4), crc = Buffer.alloc(4);
    length.writeUInt32BE(bytes.length); crc.writeUInt32BE(crc32(payload));
    return Buffer.concat([length, payload, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(Buffer.alloc((width * 3 + 1) * height), { level: 0 })), chunk("IEND", Buffer.alloc(0))]);
}
