/** Incremental SHA-256 for local content IDs, not authentication or signatures.
 * FIPS 180-4 §§4.1.2, 4.2.2, 5.1.1, 5.3.3, 6.2.2:
 * https://nvlpubs.nist.gov/nistpubs/fips/nist.fips.180-4.pdf
 * Retains the old SHA-256(canonical JSON) IDs without a document-sized string/buffer.
 */
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
const rotate = (word: number, bits: number) => (word >>> bits) | (word << (32 - bits));
export function contentHash() {
  const state = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const buffer = new Uint8Array(64), words = new Uint32Array(64);
  let used = 0, bytes = 0, finished = false;
  function block(input: Uint8Array, offset: number) {
    const view = new DataView(input.buffer, input.byteOffset + offset, 64);
    for (let i = 0; i < 16; i++) words[i] = view.getUint32(i * 4);
    for (let i = 16; i < 64; i++) {
      const x = words[i - 15], y = words[i - 2];
      words[i] = words[i - 16] + (rotate(x, 7) ^ rotate(x, 18) ^ (x >>> 3)) + words[i - 7] + (rotate(y, 17) ^ rotate(y, 19) ^ (y >>> 10));
    }
    let [a, b, c, d, e, f, g, h] = state;
    for (let i = 0; i < 64; i++) {
      const one = (h + (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + words[i]) >>> 0;
      const two = ((rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g; g = f; f = e; e = (d + one) >>> 0; d = c; c = b; b = a; a = (one + two) >>> 0;
    }
    const next = [a, b, c, d, e, f, g, h];
    for (let i = 0; i < 8; i++) state[i] += next[i];
  }
  return {
    update(input: Uint8Array) {
      if (finished) throw Error("Content hash is already complete.");
      bytes += input.length;
      if (!Number.isSafeInteger(bytes)) throw Error("Content is too large to fingerprint.");
      let offset = 0;
      if (used) {
        const length = Math.min(64 - used, input.length); buffer.set(input.subarray(0, length), used); used += length; offset += length;
        if (used === 64) { block(buffer, 0); used = 0; }
      }
      while (offset + 64 <= input.length) { block(input, offset); offset += 64; }
      if (offset < input.length) { buffer.set(input.subarray(offset), used); used += input.length - offset; }
    },
    finish() {
      if (finished) throw Error("Content hash is already complete.");
      finished = true; buffer[used++] = 0x80;
      if (used > 56) { buffer.fill(0, used); block(buffer, 0); used = 0; }
      buffer.fill(0, used, 56);
      const view = new DataView(buffer.buffer);
      view.setUint32(56, Math.floor(bytes / 0x20000000)); view.setUint32(60, (bytes * 8) >>> 0);
      block(buffer, 0);
      return Array.from(state, word => word.toString(16).padStart(8, "0")).join("");
    },
  };
}

const CHUNK = 16_384;
function* quoted(value: string): Generator<string> {
  yield '"';
  for (let start = 0; start < value.length;) {
    let end = Math.min(start + CHUNK, value.length);
    // Splitting a surrogate pair changes JSON escaping and therefore the legacy ID.
    if (end < value.length && /[\uD800-\uDBFF]/.test(value[end - 1]) && /[\uDC00-\uDFFF]/.test(value[end])) end++;
    yield JSON.stringify(value.slice(start, end)).slice(1, -1); start = end;
  }
  yield '"';
}
const omitted = (value: unknown) => value === undefined || typeof value === "function" || typeof value === "symbol";
const jsonValue = (value: unknown, key: string) => value && typeof value === "object" && "toJSON" in value && typeof value.toJSON === "function" ? value.toJSON(key) : value;
/** Same ordering/escaping as the previous canonical JSON replacer, in bounded pieces. */
export function* canonicalContent(value: unknown, ancestors = new Set<object>(), normalized = false): Generator<string> {
  if (!normalized) value = jsonValue(value, "");
  if (typeof value === "string") { yield* quoted(value); return; }
  if (value === null || typeof value === "boolean" || typeof value === "number") { yield JSON.stringify(value); return; }
  if (typeof value !== "object") throw Error("This design contains unsupported content.");
  if (ancestors.has(value) || ancestors.size > 64) throw Error("This design contains unsupported nested content.");
  ancestors.add(value);
  if (Array.isArray(value)) {
    yield "[";
    for (let i = 0; i < value.length; i++) {
      const item = jsonValue(value[i], String(i));
      if (i) yield ","; yield* canonicalContent(omitted(item) ? null : item, ancestors, true);
    }
    yield "]";
  } else {
    yield "{"; let first = true;
    // JS enumerates integer keys numerically even after the old replacer's lexical sort.
    const ordered = Object.fromEntries(Object.keys(value).sort().map(key => [key, (value as Record<string, unknown>)[key]]));
    for (const [key, raw] of Object.entries(ordered)) {
      const item = jsonValue(raw, key);
      if (omitted(item)) continue;
      if (!first) yield ","; first = false; yield* quoted(key); yield ":"; yield* canonicalContent(item, ancestors, true);
    }
    yield "}";
  }
  ancestors.delete(value);
}

export async function fingerprintDesign(guestId: string, design: unknown) {
  const hash = contentHash(), encoder = new TextEncoder(); let sinceYield = 0;
  for (const part of canonicalContent({ guestId, design })) {
    const bytes = encoder.encode(part); hash.update(bytes); sinceYield += bytes.length;
    if (sinceYield >= 1024 * 1024) { sinceYield = 0; await new Promise<void>(resolve => setTimeout(resolve, 0)); }
  }
  return `guest-${hash.finish()}`;
}
