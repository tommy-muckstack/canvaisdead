import { eventProperties, routeContext, type WebsiteEvent, type WebsiteEvents } from "./schema";
export const CONSENT_KEY = "isdead:website:analytics-consent:v1";
export const VISITOR_KEY = "isdead:website:anonymous-id:v1";
export type Consent = "unknown" | "granted" | "denied" | "blocked";
type Runtime = {
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  privacySignal: () => boolean; path: () => string; uuid: () => string; now: () => number;
  send: (url: string, options: RequestInit) => Promise<unknown>;
};
type Config = { enabled: boolean; token: string; host: string; appId: string; basePath: string };
export function createWebsiteAnalytics(config: Config, runtime: Runtime) {
  // Fail closed for missing tokens, invalid routing or non-production configuration.
  const enabled = config.enabled && /^phc_[A-Za-z0-9]+$/.test(config.token) && /^[a-z][a-z0-9_]*$/.test(config.appId)
    && ["https://us.i.posthog.com", "https://eu.i.posthog.com"].includes(config.host);
  let volatileConsent: Consent = "unknown", volatileId = "", minute = -1, count = 0, storageUnavailable = false, forceNewId = false;
  const getConsent = (): Consent => {
    if (runtime.privacySignal()) return "blocked";
    if (storageUnavailable) return volatileConsent;
    try { const value = runtime.storage.getItem(CONSENT_KEY); return value === "granted" || value === "denied" ? value : "unknown"; }
    catch { return volatileConsent; }
  };
  const setConsent = (value: "granted" | "denied") => {
    volatileConsent = value;
    try { runtime.storage.setItem(CONSENT_KEY, value); storageUnavailable = false; } catch { storageUnavailable = true; }
    if (value === "denied") {
      volatileId = "";
      forceNewId = true;
      try { runtime.storage.removeItem(VISITOR_KEY); } catch { /* No storage access. */ }
    }
  };
  const capture = <E extends WebsiteEvent>(event: E, properties: WebsiteEvents[E]): boolean => {
    try {
      if (!enabled || getConsent() !== "granted") return false;
      const safe = eventProperties(event, properties); if (!safe) return false;
      const currentMinute = Math.floor(runtime.now() / 60_000);
      if (minute !== currentMinute) { minute = currentMinute; count = 0; }
      if (count >= 60) return false; // Per-tab burst protection; not an account billing limit.
      let id = volatileId;
      try { if (!forceNewId && !storageUnavailable) id = runtime.storage.getItem(VISITOR_KEY) || ""; } catch { /* Use memory. */ }
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) id = runtime.uuid();
      if (!/^[0-9a-f-]{36}$/i.test(id)) return false;
      volatileId = id;
      try { runtime.storage.setItem(VISITOR_KEY, id); } catch { /* Current tab only. */ }
      count++;
      const body = JSON.stringify({ api_key: config.token, distinct_id: id, event, properties: {
        ...safe, suite_id: "isdead", app_id: config.appId, platform: "web", schema_version: 1, environment: "production",
        ...routeContext(runtime.path(), config.basePath), $process_person_profile: false, $geoip_disable: true,
      } });
      void runtime.send(`${config.host}/i/v0/e/`, { method: "POST", headers: { "Content-Type": "application/json" }, body,
        credentials: "omit", referrerPolicy: "no-referrer", keepalive: true }).catch(() => {});
      return true;
    } catch { return false; } // Analytics must never break auth, saving or export.
  };
  return { enabled, getConsent, setConsent, capture };
}
