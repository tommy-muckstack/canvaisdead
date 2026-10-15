import { describe, expect, it, vi } from "vitest";
import { CONSENT_KEY, VISITOR_KEY, createWebsiteAnalytics } from "@/lib/analytics/core";
import { eventProperties, routeContext } from "@/lib/analytics/schema";
const firstId = "11111111-1111-4111-8111-111111111111", secondId = "22222222-2222-4222-8222-222222222222";
function setup(overrides = {}) {
  const data = new Map<string, string>();
  const storage = { getItem: vi.fn((key: string) => data.get(key) ?? null), setItem: vi.fn((key: string, value: string) => { data.set(key, value); }), removeItem: vi.fn((key: string) => { data.delete(key); }) };
  const runtime = { storage, privacySignal: vi.fn(() => false), path: () => "/canvaisdead/app/design/private-design?email=private#text", uuid: vi.fn(() => firstId), now: vi.fn(() => 60_000), send: vi.fn(async () => ({})) };
  const client = createWebsiteAnalytics({ enabled: true, token: "phc_test", host: "https://us.i.posthog.com", appId: "canvaisdead", basePath: "/canvaisdead", ...overrides }, runtime);
  return { ...client, runtime, data };
}
describe("website analytics privacy boundary", () => {
  it("does not generate an identity, queue or send before explicit consent", () => {
    const x = setup(); expect(x.capture("website_page_viewed", {})).toBe(false);
    x.data.set("canvaisdead:cookies", "1"); expect(x.capture("website_page_viewed", {})).toBe(false);
    expect(x.runtime.uuid).not.toHaveBeenCalled(); expect(x.runtime.send).not.toHaveBeenCalled();
    x.setConsent("granted"); expect(x.runtime.send).not.toHaveBeenCalled();
    x.capture("website_page_viewed", {}); expect(x.runtime.send).toHaveBeenCalledTimes(1);
  });
  it("sends only the shared schema and allowed values, without URL or content leakage", () => {
    const x = setup(); x.setConsent("granted");
    x.capture("website_design_created", { source: "template", name: "private", email: "private", app_id: "fake", $current_url: "private" } as never);
    const [url, options] = x.runtime.send.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://us.i.posthog.com/i/v0/e/");
    const body = JSON.parse(String(options.body));
    expect(body.properties).toEqual({ source: "template", suite_id: "isdead", app_id: "canvaisdead", platform: "web", schema_version: 1, environment: "production", route: "/app/design/:id", surface: "editor", $process_person_profile: false, $geoip_disable: true });
    expect(body.distinct_id).toBe(firstId); expect(String(options.body)).not.toContain("private");
    expect(options).toMatchObject({ credentials: "omit", referrerPolicy: "no-referrer", keepalive: true });
  });
  it("drops unknown event names and invalid properties", () => {
    expect(eventProperties("__proto__", {})).toBeNull(); expect(eventProperties("website_export_completed", { format: "private filename" })).toBeNull();
    expect(eventProperties("website_auth_started", { method: "email" })).toBeNull();
    const x = setup(); x.setConsent("granted"); expect(x.capture("website_export_completed", { format: "pdf" } as never)).toBe(false); expect(x.runtime.send).not.toHaveBeenCalled();
  });
  it("honors privacy signals even after consent", () => {
    const x = setup(); x.setConsent("granted"); x.runtime.privacySignal.mockReturnValue(true);
    expect(x.getConsent()).toBe("blocked"); expect(x.capture("website_page_viewed", {})).toBe(false); expect(x.runtime.uuid).not.toHaveBeenCalled();
  });
  it("withdraws consent immediately and rotates identity after renewed consent", () => {
    const x = setup(); x.setConsent("granted"); x.capture("website_page_viewed", {});
    x.setConsent("denied"); expect(x.data.has(VISITOR_KEY)).toBe(false); expect(x.capture("website_page_viewed", {})).toBe(false);
    x.runtime.uuid.mockReturnValue(secondId); x.setConsent("granted"); x.capture("website_page_viewed", {});
    expect(x.data.get(VISITOR_KEY)).toBe(secondId);
  });
  it("keeps denial effective even if storage rejects the write", () => {
    const x = setup(); x.setConsent("granted"); x.capture("website_page_viewed", {});
    x.runtime.storage.setItem.mockImplementation(() => { throw Error("quota"); }); x.runtime.storage.removeItem.mockImplementation(() => { throw Error("blocked"); });
    x.setConsent("denied"); expect(x.getConsent()).toBe("denied"); expect(x.capture("website_page_viewed", {})).toBe(false);
  });
  it("observes consent changes from other tabs and does not reuse deleted preferences", () => {
    const x = setup(); x.data.set(CONSENT_KEY, "granted"); expect(x.capture("website_page_viewed", {})).toBe(true);
    x.data.set(CONSENT_KEY, "denied"); expect(x.capture("website_page_viewed", {})).toBe(false);
    x.data.clear(); expect(x.getConsent()).toBe("unknown");
    x.runtime.uuid.mockReturnValue(secondId); x.data.set(CONSENT_KEY, "granted"); x.capture("website_page_viewed", {});
    expect(x.data.get(VISITOR_KEY)).toBe(secondId);
  });
  it.each([{ enabled: false }, { token: "" }, { host: "https://collector.example" }])("fails closed for unsafe configuration %j", config => {
    const x = setup(config); x.setConsent("granted"); expect(x.enabled).toBe(false); expect(x.capture("website_page_viewed", {})).toBe(false);
  });
  it("never propagates network failures or storage exceptions", async () => {
    const x = setup(); x.runtime.storage.getItem.mockImplementation(() => { throw Error("blocked"); });
    x.runtime.storage.setItem.mockImplementation(() => { throw Error("blocked"); });
    x.runtime.send.mockRejectedValue(Error("offline")); x.setConsent("granted");
    expect(() => x.capture("website_page_viewed", {})).not.toThrow(); await Promise.resolve();
  });
  it("caps event bursts without retrying them later", () => {
    const x = setup(); x.setConsent("granted"); for (let i = 0; i < 100; i++) x.capture("website_page_viewed", {});
    expect(x.runtime.send).toHaveBeenCalledTimes(60); x.runtime.now.mockReturnValue(120_000);
    x.capture("website_page_viewed", {}); expect(x.runtime.send).toHaveBeenCalledTimes(61);
  });
  it("masks unknown paths, query strings, hashes and design ids", () => {
    expect(routeContext("/login?callbackUrl=secret", "")).toEqual({ surface: "auth", route: "/login" });
    expect(routeContext("/canvaisdead/app/design/personal-name", "/canvaisdead").route).toBe("/app/design/:id");
    expect(routeContext("/unknown/private", "/canvaisdead").route).toBe("other");
    expect(routeContext("/canvaisdead/", "/canvaisdead").route).toBe("/");
  });
});
