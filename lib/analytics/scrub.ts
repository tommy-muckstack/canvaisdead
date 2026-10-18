// URLs PostHog attaches automatically ($current_url, $pathname, $referrer, …) are reduced to route patterns before
// sending: design ids become :id and query strings / hashes are dropped (they can carry callback URLs or search text).
import type { CaptureResult } from "posthog-js";
const URL_KEYS = ["$current_url", "$pathname", "$referrer", "$prev_pageview_pathname", "$initial_current_url", "$initial_pathname", "$initial_referrer"];
export function scrubUrl(v: string): string {
  return v.split(/[?#]/, 1)[0].replace(/\/app\/design\/[^/]+/, "/app/design/:id");
}
function scrubProps(o: Record<string, unknown> | undefined) {
  if (!o) return;
  for (const k of URL_KEYS) if (typeof o[k] === "string" && o[k] !== "$direct") o[k] = scrubUrl(o[k] as string);
}
export function scrubEvent(e: CaptureResult | null): CaptureResult | null {
  if (!e) return e;
  if (e.properties) delete e.properties.title; // the page title can be a design name
  scrubProps(e.properties); scrubProps(e.$set as Record<string, unknown> | undefined); scrubProps(e.$set_once as Record<string, unknown> | undefined);
  return e;
}
/** Same name and loose signature as the shared kit's helper. */
export const scrub = (e: any) => scrubEvent(e) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
