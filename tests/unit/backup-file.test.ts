import { describe, expect, it } from "vitest";
import { designBackupBlob, readDesignBackup } from "@/lib/design/backup-file";
import { serializeDesignBackup } from "@/lib/design/backup";
import { blankDesign, makeEl } from "@/lib/design/ops";
import { TEMPLATES, fromTemplate } from "@/lib/design/templates";

describe("bounded local backup records", () => {
  it("round-trips all templates, empty libraries and every existing legacy format", async () => {
    const designs = TEMPLATES.map(fromTemplate);
    expect(await readDesignBackup(designBackupBlob(designs))).toEqual(designs);
    expect(await readDesignBackup(designBackupBlob([]))).toEqual([]);
    for (let version = 1; version <= 6; version++) {
      const old = JSON.stringify({ format: "canvaisdead", version, designs: [blankDesign({ w: 800, h: 600 })] }, null, 2);
      expect(await readDesignBackup(new Blob([old]))).toEqual(JSON.parse(old).designs);
    }
  });
  it("preserves escaped characters and surrogate pairs split across string boundaries", async () => {
    const d = blankDesign({ w: 800, h: 600 });
    d.els = [makeEl("text", d, { text: "a".repeat(32767) + "👋\n\"\\\u0000\ud800" })];
    const blob = designBackupBlob([d]); expect(await readDesignBackup(blob)).toEqual([d]);
    expect((await blob.text()).split("\n").every(line => new Blob([line]).size < 256 * 1024)).toBe(true);
  });
  it("imports an actual backup above the former 256 MiB total cap without calling whole-file text", async () => {
    const d = blankDesign({ w: 800, h: 600 });
    const src = `data:image/png;base64,${Buffer.alloc(50 * 1024 * 1024, 23).toString("base64")}`;
    d.els = Array.from({ length: 4 }, () => makeEl("image", d, { src, w: 400, h: 400 }));
    const blob = designBackupBlob([d]); expect(blob.size).toBeGreaterThan(256 * 1024 * 1024);
    Object.defineProperty(blob, "text", { value: () => { throw Error("Must stream this file"); } });
    const [copy] = await readDesignBackup(blob);
    expect("els" in copy && copy.els.length).toBe(4);
    if ("els" in copy) for (const image of copy.els) expect(image.src).toBe(src);
    // Encoded capacity only: bytes here are not decoded as a PNG, and no IDB quota is claimed.
  }, 60_000);
  it("rejects truncation, extra values, misplaced records, duplicate keys and unsupported versions", async () => {
    const text = await designBackupBlob([blankDesign({ w: 800, h: 600 })]).text();
    for (const raw of [text.replace('["complete"]\n', ""), text + '["value",null]\n', text.replace('["array"]\n', '["chunk","oops"]\n'), text.replace('["key","id"]\n', '["key","id"]\n["key","name"]\n'), text.replace('"version":7', '"version":8')]) {
      await expect(readDesignBackup(new Blob([raw]))).rejects.toThrow();
    }
    const header = text.split("\n")[0];
    await expect(readDesignBackup(new Blob([header, '\n["array"]\n["object"]\n["key","x"]\n["value",1]\n["key","x"]\n["value",2]\n["end"]\n["end"]\n["complete"]\n']))).rejects.toThrow();
  });
  it("rejects excessive nesting, invalid UTF-8 and oversized records before import", async () => {
    const header = (await designBackupBlob([]).text()).split("\n")[0] + "\n";
    for (const body of ['["array"]\n'.repeat(70), JSON.stringify(["chunk", "x".repeat(300_000)]) + "\n"]) await expect(readDesignBackup(new Blob([header, body]))).rejects.toThrow();
    await expect(readDesignBackup(new Blob([header, new Uint8Array([255, 255])]))).rejects.toThrow();
  });
  it("rejects nonportable images and validates all designs before making an import available", async () => {
    const d = blankDesign({ w: 800, h: 600 }); d.els = [makeEl("image", d, { src: "https://example.com/source.png" })];
    expect(() => designBackupBlob([d])).toThrow("external or unsupported");
    await expect(readDesignBackup(new Blob([serializeDesignBackup([d])]))).rejects.toThrow("external or unsupported");
    const valid = blankDesign({ w: 800, h: 600 }), text = await designBackupBlob([valid]).text();
    await expect(readDesignBackup(new Blob([text.replace('["key","w"]\n["value",800]', '["key","w"]\n["value",-800]')]))).rejects.toThrow("invalid design data");
  });
});
