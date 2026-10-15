"use client";
import { BP } from "@/lib/basepath";
import { CONSENT_KEY, VISITOR_KEY, createWebsiteAnalytics, type Consent } from "./core";
import type { WebsiteEvent, WebsiteEvents } from "./schema";
const CHANGE = "isdead:website:analytics-choice";
let client: ReturnType<typeof createWebsiteAnalytics> | undefined;
function getClient() {
  if (typeof window === "undefined") return undefined;
  if (!client) client = createWebsiteAnalytics({
    enabled: process.env.NEXT_PUBLIC_POSTHOG_ENABLED === "true" && process.env.NODE_ENV === "production"
      && ["yourappisdead.com", "canvaisdead.vercel.app"].includes(window.location.hostname),
    token: process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ?? "", host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    appId: "canvaisdead", basePath: BP,
  }, {
    storage: { getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value), removeItem: key => localStorage.removeItem(key) },
    privacySignal: () => navigator.doNotTrack === "1" || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true,
    path: () => window.location.pathname, uuid: () => crypto.randomUUID(), now: () => Date.now(), send: (url, options) => fetch(url, options),
  });
  return client;
}
export const analyticsEnabled = () => getClient()?.enabled ?? false;
export const analyticsConsent = (): Consent => getClient()?.getConsent() ?? "unknown";
export const serverConsent = (): Consent => "unknown";
export function chooseAnalytics(value: "granted" | "denied") { getClient()?.setConsent(value); window.dispatchEvent(new Event(CHANGE)); }
export function subscribeAnalytics(listener: () => void) {
  const onStorage = (event: StorageEvent) => { if (!event.key || event.key === CONSENT_KEY || event.key === VISITOR_KEY) listener(); };
  window.addEventListener(CHANGE, listener); window.addEventListener("storage", onStorage);
  return () => { window.removeEventListener(CHANGE, listener); window.removeEventListener("storage", onStorage); };
}
export function trackWebsite<E extends WebsiteEvent>(event: E, properties: WebsiteEvents[E]) { return getClient()?.capture(event, properties) ?? false; }
