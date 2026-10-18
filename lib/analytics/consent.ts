// CanvaIsDead asks before sending any analytics: nothing starts (no PostHog client, no cookie, no id) until the visitor
// picks "Allow analytics". Do Not Track / Global Privacy Control always win. The choice is shared by IsDead apps on the
// same origin through the `isdead:website:*` key.
export const CONSENT_KEY = "isdead:website:analytics-consent:v1";
export type Consent = "unknown" | "granted" | "denied" | "blocked";
const CHANGE = "isdead:website:analytics-choice";
type Store = Pick<Storage, "getItem">;
let memory: Consent = "unknown"; // used when storage is blocked

/** Pure read, so it can be unit tested without a browser. */
export function readConsent(storage: Store | null, privacySignal: boolean, fallback: Consent = "unknown"): Consent {
  if (privacySignal) return "blocked";
  try { const v = storage?.getItem(CONSENT_KEY); return v === "granted" || v === "denied" ? v : storage ? "unknown" : fallback; }
  catch { return fallback; }
}
const signal = () => typeof navigator !== "undefined" && (navigator.doNotTrack === "1" || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true);
const store = (): Store | null => { try { return typeof localStorage === "undefined" ? null : localStorage; } catch { return null; } };
export const analyticsConsent = (): Consent => (typeof window === "undefined" ? "unknown" : readConsent(store(), signal(), memory));
export const serverConsent = (): Consent => "unknown";
export const consentGranted = () => analyticsConsent() === "granted";
export function setConsent(value: "granted" | "denied") {
  memory = value;
  try { localStorage.setItem(CONSENT_KEY, value); } catch { /* storage blocked: the choice lasts for this tab */ }
  window.dispatchEvent(new Event(CHANGE));
}
export function subscribeConsent(listener: () => void) {
  const onStorage = (e: StorageEvent) => { if (!e.key || e.key === CONSENT_KEY) listener(); };
  window.addEventListener(CHANGE, listener); window.addEventListener("storage", onStorage);
  return () => { window.removeEventListener(CHANGE, listener); window.removeEventListener("storage", onStorage); };
}
