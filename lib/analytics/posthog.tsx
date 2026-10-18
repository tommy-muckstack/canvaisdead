"use client";
// PostHog client for the IsDead family (shared project 666931). Requests go through our own origin (<basePath>/ingest →
// PostHog) so ad blockers don't drop them. The key is the project's publishable token; without NEXT_PUBLIC_POSTHOG_KEY
// everything is a no-op. CanvaIsDead also waits for the visitor's consent (./consent.ts): until "Allow analytics" nothing
// loads, no id or cookie is created and nothing is sent; withdrawing consent opts out and wipes the PostHog id.
import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { superProps, safeProps, LEGACY_PROPS, type EventName, type Surface } from "./taxonomy";
import { scrubEvent } from "./scrub";
export { scrub } from "./scrub";
import { analyticsConsent, consentGranted, serverConsent, subscribeConsent } from "./consent";
type PH = typeof import("posthog-js").default;
type Props = Record<string, string | number | boolean | null | undefined>;
let ph: PH | null = null; let loading: Promise<PH | null> | null = null;
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const UI_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.posthog.com";
const BP = process.env.NEXT_PUBLIC_BASE_PATH ?? "/canvaisdead";
export const analyticsEnabled = !!KEY;
// __SURFACE__: which paths (after the basePath) are the working product. Everything else is the marketing site.
const surfaceOf = (pathname: string): Surface => (/^\/(app)(\/|$)/.test(pathname.slice(BP.length)) ? "app" : "landing");

async function client(): Promise<PH | null> {
  if (!KEY || typeof window === "undefined" || !consentGranted()) return null;
  if (ph) { if (ph.has_opted_out_capturing()) { ph.opt_in_capturing({ captureEventName: null }); ph.register(superProps(surfaceOf(location.pathname))); } return ph; }
  loading ??= import("posthog-js").then(m => {
    const p = m.default;
    // Dev only: verbose logs + accept automated browsers (posthog-js drops bot/webdriver traffic by default).
    const debug = process.env.NODE_ENV !== "production" && typeof localStorage !== "undefined" && localStorage.getItem("isdead_ph_debug") === "1";
    p.init(KEY, {
      api_host: `${location.origin}${BP}/ingest`, ui_host: UI_HOST,
      capture_pageview: false, capture_pageleave: true, autocapture: false, disable_session_recording: true, capture_heatmaps: false, capture_performance: false, capture_dead_clicks: false, capture_exceptions: false, disable_surveys: true,
      persistence: "localStorage+cookie", person_profiles: "always", debug, opt_out_useragent_filter: debug,
      before_send: scrubEvent, // design ids, query strings and hashes never leave the browser
    });
    // Every IsDead app shares the yourappisdead.com cookie, and super properties persist in it: clear other apps'
    // leftovers, then set ours (otherwise the hub's product=yourappisdead would ride along on this app's events).
    for (const k of LEGACY_PROPS) p.unregister(k);
    p.register({ ...superProps(surfaceOf(location.pathname)), env: process.env.NODE_ENV === "production" ? "production" : "development" });
    ph = p; if (process.env.NODE_ENV !== "production") (window as unknown as { __posthog?: PH }).__posthog = p;
    return p;
  }).catch(err => { if (process.env.NODE_ENV !== "production") console.warn("[analytics] PostHog failed to start", err); return null; });
  return loading;
}
/** Fire a taxonomy event. Safe to call anywhere on the client; drops silently when analytics is off. */
export function track(event: EventName, props: Props = {}) {
  const safe = safeProps(event, props); if (!safe) return;
  void client().then(p => p?.capture(event, { surface: surfaceOf(location.pathname), ...safe }));
}
/** Like track, but sent immediately; await it before navigating away (sign-in redirects). Never throws or hangs past 1.5s. */
export async function trackNow(event: EventName, props: Props = {}) {
  const safe = safeProps(event, props); if (!safe) return;
  await Promise.race([client().then(p => { p?.capture(event, { surface: surfaceOf(location.pathname), ...safe }, { send_instantly: true }); }).catch(() => {}), new Promise(r => setTimeout(r, 1500))]);
}
/** Signed-in users are identified by Firebase uid (shared across the family). Guests and demo sessions never are. */
export function identify(uid: string, accountType: "firebase" | "guest" | "demo") {
  void client().then(p => { if (!p) return; p.register({ account_type: accountType }); if (accountType === "firebase") p.identify(uid, { account_type: accountType }); });
}
// reset() wipes super properties too, so put this app's back straight away.
export function resetIdentity() { void client().then(p => { p?.reset(); p?.register({ ...superProps(surfaceOf(location.pathname)), env: process.env.NODE_ENV === "production" ? "production" : "development" }); }); }
/** Mount once in the root layout: boots the client and sends a $pageview per route change. */
export function Analytics() {
  const path = usePathname();
  const consent = useSyncExternalStore(subscribeConsent, analyticsConsent, serverConsent);
  // Withdrawn (or blocked by Do Not Track / GPC) after PostHog started: stop capturing and drop the anonymous id.
  useEffect(() => { if (consent !== "granted" && ph && !ph.has_opted_out_capturing()) { ph.opt_out_capturing(); ph.reset(); } }, [consent]);
  useEffect(() => { if (!path || consent !== "granted") return; void client().then(p => { if (!p) return; p.register({ surface: surfaceOf(location.pathname) }); p.capture("$pageview"); }); }, [path, consent]);
  return null;
}
