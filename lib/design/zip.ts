// ZIP32, stored entries, UTF-8 names. No server or compression dependency.
// Format: https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT
export const MAX_DOWNLOAD_BYTES = 256 * 1024 * 1024;
const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
const ZIP32_LIMIT = 0xffffffff;
type Entry = { name: string; data: Blob | Uint8Array<ArrayBuffer>; size: number };
function archiveLayout(entries: Entry[], limit: number) {
  if (!entries.length || entries.length >= 65535) throw new Error("Choose between 1 and 65,534 files.");
  const local: BlobPart[] = [], central: BlobPart[] = [], names = new Set<string>(), checksums: ((crc: number) => void)[] = [];
  let offset = 0, directorySize = 0;
  for (const { name, data, size } of entries) {
    // eslint-disable-next-line no-control-regex -- ZIP entry names must not contain control bytes or path separators.
    if (!name || /[\\/\x00-\x1f]/.test(name) || name === "." || name === ".." || names.has(name)) throw new Error("Invalid or duplicate download filename.");
    names.add(name);
    const encoded = new TextEncoder().encode(name);
    if (encoded.length > 65535) throw new Error("Download filename is too long.");
    const header = new Uint8Array(30 + encoded.length), h = new DataView(header.buffer);
    const directory = new Uint8Array(46 + encoded.length), c = new DataView(directory.buffer);
    if (!Number.isSafeInteger(size) || size < 0 || size >= ZIP32_LIMIT || offset + header.length + size + directorySize + directory.length + 22 >= limit) throw new Error("Download is too large for one file. Select fewer pages.");
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x800, true);
    h.setUint16(12, 0x21, true); // January 1, 1980; reproducible archive metadata.
    h.setUint32(18, size, true); h.setUint32(22, size, true); h.setUint16(26, encoded.length, true);
    header.set(encoded, 30);
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x800, true);
    c.setUint16(14, 0x21, true); c.setUint32(20, size, true); c.setUint32(24, size, true);
    c.setUint16(28, encoded.length, true); c.setUint32(42, offset, true); directory.set(encoded, 46);
    checksums.push(crc => { h.setUint32(14, crc, true); c.setUint32(16, crc, true); });
    local.push(header, data); central.push(directory);
    offset += header.length + size; directorySize += directory.length;
  }
  const end = new Uint8Array(22), e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, entries.length, true); e.setUint16(10, entries.length, true);
  e.setUint32(12, directorySize, true); e.setUint32(16, offset, true);
  return { checksums, finish: () => new Blob([...local, ...central, end], { type: "application/zip" }) };
}
export function zipFiles(entries: { name: string; data: Uint8Array<ArrayBuffer> }[]): Blob {
  const archive = archiveLayout(entries.map(entry => ({ ...entry, size: entry.data.byteLength })), MAX_DOWNLOAD_BYTES);
  entries.forEach((entry, index) => archive.checksums[index](crc32(entry.data)));
  return archive.finish();
}
/** ZIP32 metadata imposes a <4 GiB archive limit. Payloads remain Blob parts throughout. */
export async function zipBlobs(entries: { name: string; data: Blob }[], signal?: AbortSignal): Promise<Blob> {
  signal?.throwIfAborted();
  const archive = archiveLayout(entries.map(entry => ({ ...entry, size: entry.data.size })), ZIP32_LIMIT);
  for (const [index, entry] of entries.entries()) {
    let crc = 0xffffffff;
    for (let offset = 0; offset < entry.data.size; offset += 65536) {
      signal?.throwIfAborted();
      const bytes = new Uint8Array(await entry.data.slice(offset, offset + 65536).arrayBuffer());
      for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
      if (offset % (1024 * 1024) === 0) await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
    archive.checksums[index]((crc ^ 0xffffffff) >>> 0);
  }
  signal?.throwIfAborted(); return archive.finish();
}
