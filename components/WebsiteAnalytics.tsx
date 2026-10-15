"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { analyticsConsent, analyticsEnabled, chooseAnalytics, serverConsent, subscribeAnalytics, trackWebsite } from "@/lib/analytics/client";

export function WebsiteAnalytics() {
  const pathname = usePathname();
  const consent = useSyncExternalStore(subscribeAnalytics, analyticsConsent, serverConsent);
  const enabled = useSyncExternalStore(subscribeAnalytics, analyticsEnabled, () => false);
  const [open, setOpen] = useState(false);
  const previous = useRef("");
  const trigger = useRef<HTMLButtonElement>(null);
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!enabled || consent !== "granted") { previous.current = ""; return; }
    if (pathname && pathname !== previous.current && trackWebsite("website_page_viewed", {})) previous.current = pathname;
  }, [pathname, consent, enabled]);
  useEffect(() => { if (open) first.current?.focus(); }, [open]);
  // Keep analytics prompts out of projected slides. Consent is managed in the editor.
  if (!enabled || /\/app\/design\/[^/]+\/present\/?$/.test(pathname ?? "")) return null;
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const choose = (value: "granted" | "denied") => { chooseAnalytics(value); close(); };
  return <>
    <button ref={trigger} className="wa-choice" type="button" aria-expanded={open || consent === "unknown"} aria-controls="website-privacy" onClick={() => setOpen(true)}>Privacy choices</button>
    {(open || consent === "unknown") && <section id="website-privacy" className="wa-banner" aria-label="Website analytics choices" onKeyDown={event => { if (event.key === "Escape" && consent !== "unknown") close(); }}>
      <h2>Your privacy choices</h2>
      <p>Essential storage keeps you signed in and saves your designs on this device. Optional analytics helps improve CanvaIsDead and other IsDead apps using anonymous usage events sent to PostHog in the US. We never include your designs, uploads, email or recordings of your session.</p>
      {consent === "blocked" ? <><p>Your browser privacy signal is respected. Analytics is off.</p><button ref={first} type="button" onClick={close}>Close</button></> : <div className="wa-actions">
        <button ref={first} type="button" onClick={() => choose("denied")}>Essential only</button>
        <button type="button" onClick={() => choose("granted")}>Allow analytics</button>
      </div>}
    </section>}
  </>;
}
