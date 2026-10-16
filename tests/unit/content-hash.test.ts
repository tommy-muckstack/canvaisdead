import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { canonicalContent, contentHash, fingerprintDesign } from "@/lib/design/content-hash";

const canonical = (value: unknown) => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
describe("bounded local content fingerprints", () => {
  it("matches SHA-256 known answers and Node's independent implementation", () => {
    for (const [input, expected] of [["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"], ["abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"], ["a".repeat(1_000_000), "cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0"]]) {
      const hash = contentHash(); hash.update(new TextEncoder().encode(input)); expect(hash.finish()).toBe(expected);
      expect(() => hash.update(new Uint8Array())).toThrow("complete"); expect(() => hash.finish()).toThrow("complete");
    }
    for (const length of [0, 1, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 1025, 65537]) {
      const data = Uint8Array.from({ length: length + 7 }, (_, i) => i * 71).subarray(7), expected = createHash("sha256").update(data).digest("hex");
      for (const chunk of [1, 7, 64, 129, 16384]) {
        const hash = contentHash(); for (let i = 0; i < data.length; i += chunk) hash.update(data.subarray(i, i + chunk));
        expect(hash.finish()).toBe(expected);
      }
    }
  });
  it("retains the old canonical JSON bytes and IDs, including numeric keys and Unicode boundaries", async () => {
    const values = [null, true, -0, 1e30, { z: 1, a: [undefined, NaN, Infinity, -Infinity, false], missing: undefined },
      { "10": 10, "2": 2, "01": 1, z: "end", a: "start" }, JSON.parse('{"__proto__":{"x":1},"constructor":"safe"}'),
      { date: new Date("2026-10-16T00:00:00Z"), omit: { toJSON: () => undefined }, array: [{ toJSON: () => undefined }] },
      "a".repeat(16383) + "🌈" + "\uD800" + "\uDC00" + "\uDC00" + "\uD800" + "\n\t\r\b\f\u0000\\\"", "\u0001".repeat(70000),
      { ["🌈".repeat(20000)]: "long key", value: "東京".repeat(10000) }];
    for (const value of values) {
      const parts = [...canonicalContent(value)]; expect(parts.join("")).toBe(canonical(value));
      expect(parts.every(part => new TextEncoder().encode(part).length <= 100_000)).toBe(true);
      const oldId = "guest-" + createHash("sha256").update(canonical({ guestId: "g_exampleguestid", design: value })).digest("hex");
      expect(await fingerprintDesign("g_exampleguestid", value)).toBe(oldId);
    }
  });
  it("distinguishes changed content and owners, yields to the event loop, and rejects cycles", async () => {
    const original = { text: "a".repeat(2 * 1024 * 1024) }, result = await fingerprintDesign("g_firstguestid", original);
    expect(await fingerprintDesign("g_firstguestid", { ...original, name: "Changed" })).not.toBe(result);
    expect(await fingerprintDesign("g_secondguestid", original)).not.toBe(result);
    let yielded = false; const timer = setTimeout(() => { yielded = true; }, 0);
    await fingerprintDesign("g_firstguestid", original); clearTimeout(timer); expect(yielded).toBe(true);
    const cyclic: { self?: unknown } = {}; cyclic.self = cyclic;
    await expect(fingerprintDesign("g_firstguestid", cyclic)).rejects.toThrow("nested");
  });
});
