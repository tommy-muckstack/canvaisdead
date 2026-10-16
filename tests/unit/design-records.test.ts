import { describe, expect, it } from "vitest";
import { blankDesign, makeEl } from "@/lib/design/ops";
import { designRecordsBlob, designStorageBlob, readDesignRecords } from "@/lib/design/record-file";
import { designBackupBlob, readDesignBackup } from "@/lib/design/backup-file";
import { designRecoveryFile } from "@/lib/design/recovery";

describe("Blob design payloads and raw recovery", () => {
  it("keeps local validation separate from portable backup import restrictions", async () => {
    const design = blankDesign({ w: 800, h: 600 });
    design.els = [makeEl("image", design, { src: "https://example.invalid/legacy.png" })];
    const local = designRecordsBlob([design]);
    expect(await readDesignRecords(local)).toEqual([design]);
    expect(() => designBackupBlob([design])).toThrow("external or unsupported");
    await expect(readDesignBackup(local)).rejects.toThrow("external or unsupported");
  });
  it("writes identical v7 bytes asynchronously and yields during a large autosave", async () => {
    const design = blankDesign({ w: 800, h: 600 });
    design.name = "x".repeat(32767) + "🌈" + "\ud800" + '"\\\n'.repeat(400_000);
    let painted = false; const timer = setTimeout(() => { painted = true; }, 0);
    const blob = await designStorageBlob([design]); clearTimeout(timer);
    expect(painted).toBe(true);
    expect(await blob.text()).toBe(await designBackupBlob([design]).text());
    expect(await readDesignRecords(blob)).toEqual([design]);
    expect(await readDesignBackup(blob)).toEqual([design]);
  });
  it("rejects unknown structured values instead of silently discarding their content", async () => {
    const design = blankDesign({ w: 800, h: 600 });
    for (const extra of [new Date(), new Blob(["original"]), new Map([["x", 1]])]) {
      await expect(designStorageBlob([{ ...design, extra } as typeof design])).rejects.toThrow("unsupported data");
    }
    const cycle = { ...design, extra: {} }; cycle.extra = cycle;
    await expect(designStorageBlob([cycle])).rejects.toThrow("unsupported nested data");
  });
  it("recovers exact Blob bytes even when record metadata or the payload is unreadable", async () => {
    const data = new Blob([new Uint8Array([255, 0, 123, 10])]);
    const file = await designRecoveryFile({ version: 99, owner: null, revision: null, data });
    expect(file.blob).toBe(data); expect(file.name.endsWith(".canvaisdead")).toBe(true);
    expect(new Uint8Array(await file.blob.arrayBuffer())).toEqual(new Uint8Array([255, 0, 123, 10]));
  });
  it("keeps legacy malformed record values in a bounded JSON recovery download", async () => {
    const raw = { version: 1, value: [{ name: '"🌈\n'.repeat(30_000), invalid: true }], revision: "old" };
    const file = await designRecoveryFile(raw);
    expect(file.name.endsWith(".txt")).toBe(true); expect(JSON.parse(await file.blob.text())).toEqual(raw);
  });
});
