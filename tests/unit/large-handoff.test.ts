import { constants } from "node:buffer";
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { copyGuestDesigns } from "@/lib/design/guest-handoff";
import { canonicalContent, fingerprintDesign } from "@/lib/design/content-hash";
import { blankDesign, makeEl } from "@/lib/design/ops";
import { DesignConflict, type DesignRecord, type DesignRepository } from "@/lib/design/repository";
import type { Design } from "@/lib/design/types";

const handoff = { guestId: "g_abcdefghijklmno", accountId: "account-one" };
function fixture(source: Design[], target: Design[] = []) {
  const records = new Map<string, DesignRecord>([[handoff.guestId, { revision: "guest", value: source }], [handoff.accountId, { revision: "account", value: target }]]);
  let revision = 0;
  const repository: DesignRepository = {
    read: async owner => records.get(owner)!,
    write: vi.fn(async (owner, expected, value) => {
      if (records.get(owner)!.revision !== expected.revision) throw new DesignConflict();
      const next = { revision: `write-${++revision}`, value }; records.set(owner, next); return next;
    }),
  };
  return { repository, records };
}
const design = () => blankDesign({ w: 800, h: 600 });
describe("large structured design handoff", () => {
  it("copies the eight-source regression library and a large account library without aggregate JSON", async () => {
    const src = `data:image/png;base64,${Buffer.alloc(50 * 1024 * 1024, 23).toString("base64")}`;
    const source = Array.from({ length: 8 }, () => { const d = design(); d.els = [makeEl("image", d, { src })]; return d; });
    const existing = source.map((d, i) => ({ ...d, id: `account-${i}`, name: "Existing account artwork" }));
    expect(src.length * source.length).toBeGreaterThan(constants.MAX_STRING_LENGTH);
    const f = fixture(source, existing), progress = vi.fn(), stringify = JSON.stringify;
    // Fingerprinting may stringify only bounded primitive chunks, never a library/design.
    const spy = vi.spyOn(JSON, "stringify").mockImplementation((value: unknown) => {
      if ((value !== null && typeof value === "object") || (typeof value === "string" && value.length > 16385)) throw Error("Unbounded handoff serialization");
      return stringify(value);
    });
    let result: Awaited<ReturnType<typeof copyGuestDesigns>>;
    try { result = await copyGuestDesigns(f.repository, handoff, undefined, progress); } finally { spy.mockRestore(); }
    expect(result.copied).toBe(8); expect(result.designIds.size).toBe(8);
    const saved = f.records.get(handoff.accountId)!.value;
    expect(saved.length).toBe(16); expect(f.repository.write).toHaveBeenCalledTimes(1);
    expect(saved.slice(8).every((d, i) => d === existing[i])).toBe(true);
    expect(saved.slice(0, 8).every(d => "els" in d && d.els[0].src === src)).toBe(true);
    expect(f.records.get(handoff.guestId)!.value === source).toBe(true);
    expect(progress.mock.calls.at(-1)).toEqual([8, 8]);
    // Encoded capacity with a repository double; does not claim image decoding or native quotas.
  }, 120_000);
  it("fingerprints one design above the string/32-bit bit-length limit with the existing SHA-256 ID", async () => {
    const d = design(), src = `data:image/png;base64,${Buffer.alloc(50 * 1024 * 1024, 31).toString("base64")}`;
    d.els = Array.from({ length: 8 }, () => makeEl("image", d, { src }));
    expect(src.length * d.els.length).toBeGreaterThan(constants.MAX_STRING_LENGTH);
    const independent = createHash("sha256");
    for (const chunk of canonicalContent({ guestId: handoff.guestId, design: d })) independent.update(chunk);
    expect(await fingerprintDesign(handoff.guestId, d)).toBe(`guest-${independent.digest("hex")}`);
  }, 120_000);
  it("reuses legacy content IDs and preserves later account edits on retry", async () => {
    const d = design(), canonical = JSON.stringify({ guestId: handoff.guestId, design: d }, (_key, value) => value && typeof value === "object" && !Array.isArray(value) ? Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]])) : value);
    const id = "guest-" + createHash("sha256").update(canonical).digest("hex"), existing = { ...d, id, name: "Account edited this" }, f = fixture([d], [existing]);
    const copied = await copyGuestDesigns(f.repository, handoff);
    expect(copied.copied).toBe(0); expect(copied.designIds.get(d.id)).toBe(id); expect(f.repository.write).not.toHaveBeenCalled();
    expect(f.records.get(handoff.accountId)!.value[0]).toBe(existing);
  });
  it("uses atomic target revisions and keeps both libraries when another tab wins", async () => {
    const d = design(), f = fixture([d]), write = f.repository.write, other = design(); let changed = false;
    f.repository.write = async (...args) => {
      if (!changed) { changed = true; f.records.set(handoff.accountId, { revision: "other-tab", value: [other] }); }
      return write(...args);
    };
    await expect(copyGuestDesigns(f.repository, handoff)).rejects.toThrow("Account designs changed");
    expect(f.records.get(handoff.accountId)!.value).toEqual([other]); expect(f.records.get(handoff.guestId)!.value).toEqual([d]);
    expect((await copyGuestDesigns(f.repository, handoff)).copied).toBe(1);
    expect(f.records.get(handoff.accountId)!.value[1]).toBe(other);
  });
  it("checks guest revisions and immutable pending edits after writes, allowing idempotent recovery", async () => {
    for (const change of ["source", "memory", "target"] as const) {
      const d = design(), f = fixture([d]), write = f.repository.write;
      let memory = { status: "unsaved" as const, value: [{ ...d, name: "Pending" }] };
      const pending = (owner: string) => owner === handoff.guestId ? memory : undefined;
      f.repository.write = async (...args) => {
        const saved = await write(...args);
        if (change === "source") f.records.set(handoff.guestId, { revision: "new-guest", value: [{ ...d, name: "New saved guest" }] });
        if (change === "memory") memory = { ...memory, value: [{ ...d, name: "New pending guest" }] };
        if (change === "target") f.records.set(handoff.accountId, { revision: "new-account", value: saved.value.map(item => ({ ...item, name: "Later account edit" })) });
        return saved;
      };
      await expect(copyGuestDesigns(f.repository, handoff, pending)).rejects.toThrow("changed");
      f.repository.write = write; const before = f.records.get(handoff.accountId)!.value;
      await copyGuestDesigns(f.repository, handoff, pending);
      expect(before.every(item => f.records.get(handoff.accountId)!.value.some(saved => saved === item))).toBe(true);
    }
  });
});
