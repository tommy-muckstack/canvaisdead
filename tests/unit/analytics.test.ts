import { describe, it, expect } from "vitest";
import { EVENTS, EVENT_PREFIXES, APP, superProps } from "@/lib/analytics/taxonomy";
describe("analytics taxonomy", () => {
  it("uses the shared prefixes and snake_case", () => { for (const e of Object.values(EVENTS)) { expect(e, e).toMatch(/^[a-z]+(_[a-z]+)+$/); expect(EVENT_PREFIXES.some(p => e.startsWith(p)), e).toBe(true); } });
  it("never puts the product name in an event name", () => { for (const e of Object.values(EVENTS)) expect(e.includes(APP.replace(/isdead$/, ""))).toBe(false); });
  it("sends the hub's super properties", () => { expect(superProps("app")).toEqual({ product: APP, surface: "app", platform: "web" }); });
});
import { safeProps } from "@/lib/analytics/taxonomy";
import { readConsent, CONSENT_KEY } from "@/lib/analytics/consent";
import { scrubEvent, scrubUrl } from "@/lib/analytics/scrub";
const store = (v: string | null) => ({ getItem: (k: string) => (k === CONSENT_KEY ? v : null) });
describe("CanvaIsDead privacy boundary", () => {
  it("starts nothing until the visitor allows analytics, and privacy signals always win", () => {
    expect(readConsent(store(null), false)).toBe("unknown");
    expect(readConsent(store("1"), false)).toBe("unknown"); // the legacy canvaisdead:cookies flag is not consent
    expect(readConsent(store("denied"), false)).toBe("denied");
    expect(readConsent(store("granted"), false)).toBe("granted");
    expect(readConsent(store("granted"), true)).toBe("blocked");
    expect(readConsent({ getItem: () => { throw Error("blocked"); } }, false, "denied")).toBe("denied");
  });
  it("rebuilds properties from the allowlist and drops events with unknown values", () => {
    expect(safeProps("app_design_created", { origin: "template", name: "private", email: "private", $current_url: "private" })).toEqual({ origin: "template" });
    expect(safeProps("app_design_exported", { format: "private filename" })).toBeNull();
    expect(safeProps("app_auth_started", { method: "email" })).toBeNull();
    expect(safeProps("__proto__", {})).toBeNull();
    expect(safeProps("app_backup_failed", { action: "import", library: "uploads", name: "private.png" })).toEqual({ action: "import", library: "uploads" });
    expect(safeProps("app_backup_completed", { action: "download" })).toEqual({ action: "download" });
    expect(safeProps("app_backup_completed", { action: "download", library: "private" })).toBeNull();
  });
  it("reduces automatic URLs to route patterns", () => {
    expect(scrubUrl("https://yourappisdead.com/canvaisdead/app/design/personal-name?x=1#t")).toBe("https://yourappisdead.com/canvaisdead/app/design/:id");
    expect(scrubUrl("/canvaisdead/login?callbackUrl=secret")).toBe("/canvaisdead/login");
    const e = scrubEvent({ uuid: "u", event: "$pageview", properties: { $current_url: "https://x/canvaisdead/app/design/abc?q=1", $pathname: "/canvaisdead/app/design/abc", $referrer: "$direct" }, $set_once: { $initial_current_url: "https://x/?utm=1" } } as never)!;
    expect(e.properties).toMatchObject({ $current_url: "https://x/canvaisdead/app/design/:id", $pathname: "/canvaisdead/app/design/:id", $referrer: "$direct" });
    expect((e.$set_once as Record<string, string>).$initial_current_url).toBe("https://x/");
  });
});
describe("page titles", () => { it("are dropped", () => { expect(scrubEvent({ uuid: "u", event: "$pageview", properties: { title: "My private design" } } as never)!.properties).not.toHaveProperty("title"); }); });
import { scrub } from "@/lib/analytics/posthog";
describe("analytics privacy", () => {
  it("strips query strings, hashes and titles", () => {
    const e = scrub({ event: "$pageview", properties: { $current_url: "https://yourappisdead.com/x/app?url=https://secret.example#frag", $referrer: "https://google.com/search?q=me", title: "My private doc" } });
    expect(e.properties.$current_url).toBe("https://yourappisdead.com/x/app"); expect(e.properties.$referrer).toBe("https://google.com/search"); expect("title" in e.properties).toBe(false);
  });
});
