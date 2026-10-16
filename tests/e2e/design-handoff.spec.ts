import { test, expect } from "./fixtures";
import { designModules } from "./upload-modules";

test.beforeEach(async ({ page }) => { await page.goto("/canvaisdead/login"); await designModules(page); });

test("legacy copies retain their IDs and account edits when structured handoff retries", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { createDesignRepository, designStorageKey } = window.designHandoffTest.repository, { copyGuestDesigns } = window.designHandoffTest.handoff;
    const pair = { guestId: "g_legacydesigncopy", accountId: "legacy-design-account" };
    const original = { id: "guest-design", name: "Guest 🌈", w: 800, h: 600, bg: "#fff", els: [], updatedAt: 1 };
    const canonical = JSON.stringify({ guestId: pair.guestId, design: original }, (_key, value) => value && typeof value === "object" && !Array.isArray(value) ? Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]])) : value);
    const id = "guest-" + Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical))), byte => byte.toString(16).padStart(2, "0")).join("");
    const raw = JSON.stringify([original]); localStorage.setItem(designStorageKey(pair.guestId), raw);
    const repo = createDesignRepository(), account = { ...original, id, name: "Edited in account" };
    await repo.write(pair.accountId, await repo.read(pair.accountId), [account]);
    const copied = await copyGuestDesigns(repo, pair), saved = await repo.read(pair.accountId);
    return { copied: copied.copied, sameId: copied.designIds.get(original.id) === id, names: saved.value.map(item => item.name), preservedLegacy: localStorage.getItem(designStorageKey(pair.guestId)) === raw };
  });
  expect(result).toEqual({ copied: 0, sameId: true, names: ["Edited in account"], preservedLegacy: true });
});

test("a concurrent account write prevents replacement and the transfer retries against its new revision", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { createDesignRepository } = window.designHandoffTest.repository, { copyGuestDesigns } = window.designHandoffTest.handoff;
    const pair = { guestId: "g_revisiondesigns", accountId: "revision-design-account" }, repo = createDesignRepository();
    const guest = { id: "guest", name: "Guest", w: 800, h: 600, bg: "#fff", els: [], updatedAt: 1 }, other = { ...guest, id: "account", name: "Other tab" };
    await repo.write(pair.guestId, await repo.read(pair.guestId), [guest]);
    const concurrent = { ...repo, write: async (...args: Parameters<typeof repo.write>) => {
      await repo.write(pair.accountId, await repo.read(pair.accountId), [other]); return repo.write(...args);
    } };
    let failed = false; try { await copyGuestDesigns(concurrent, pair); } catch { failed = true; }
    const before = (await repo.read(pair.accountId)).value.map(item => item.name);
    const retried = await copyGuestDesigns(repo, pair), again = await copyGuestDesigns(repo, pair);
    return { failed, before, copied: retried.copied, copiedAgain: again.copied, after: (await repo.read(pair.accountId)).value.map(item => item.name), source: (await repo.read(pair.guestId)).value[0].name };
  });
  expect(result).toEqual({ failed: true, before: ["Other tab"], copied: 1, copiedAgain: 0, after: ["Guest", "Other tab"], source: "Guest" });
});

test("real raster bytes survive structured guest transfer, reload and a second transfer", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { createDesignRepository } = window.designHandoffTest.repository, { copyGuestDesigns } = window.designHandoffTest.handoff;
    const pair = { guestId: "g_rasterdesigncopy", accountId: "raster-design-account" }, repo = createDesignRepository();
    const canvas = document.createElement("canvas"); canvas.width = 1600; canvas.height = 1600;
    const ctx = canvas.getContext("2d")!, pixels = ctx.createImageData(1600, 1600); let seed = 12345;
    for (let i = 0; i < pixels.data.length; i += 4) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; pixels.data[i] = seed & 255; pixels.data[i + 1] = seed >>> 8 & 255; pixels.data[i + 2] = seed >>> 16 & 255; pixels.data[i + 3] = 255; }
    ctx.putImageData(pixels, 0, 0); const src = canvas.toDataURL("image/png");
    const image = { id: "image", type: "image" as const, x: 0, y: 0, w: 800, h: 800, rotation: 0, opacity: 1, fill: "#fff", stroke: "#000", strokeWidth: 0, radius: 0, src };
    const source = { id: "guest", name: "Guest raster", w: 800, h: 800, bg: "#fff", els: [image], updatedAt: 1 };
    await repo.write(pair.guestId, await repo.read(pair.guestId), [source]); await copyGuestDesigns(repo, pair);
    const reopened = createDesignRepository(), copied = (await reopened.read(pair.accountId)).value[0];
    const restored = "els" in copied ? copied.els[0].src : undefined;
    const preview = new Image(); preview.src = restored!; await preview.decode();
    return { sourceBytes: atob(src.split(",")[1]).length, identical: restored === src, width: preview.naturalWidth, copiedAgain: (await copyGuestDesigns(reopened, pair)).copied };
  });
  expect(result.sourceBytes).toBeGreaterThan(5 * 1024 * 1024);
  expect(result).toMatchObject({ identical: true, width: 1600, copiedAgain: 0 });
});
