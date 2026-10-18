// Privacy: every URL property posthog-js attaches (any key ending in url / referrer / pathname: $current_url,
// $session_entry_url, $initial_referrer, …), at the top level and inside $set / $set_once wherever those sit, keeps only
// origin + path; design ids become :id; the page title (can be a design name) is dropped.
const PRIVATE_PATHS: RegExp[] = [/(\/app\/design\/)[^/?#]+/];
const URL_KEY = /(url|referrer|pathname)$/i;
export function scrubUrl(v: string): string { let u = v.split(/[?#]/, 1)[0]!; for (const re of PRIVATE_PATHS) u = u.replace(re, "$1:id"); return u; }
const cleanBag = (bag: unknown) => { if (!bag || typeof bag !== "object") return; const o = bag as Record<string, unknown>; for (const k of Object.keys(o)) if (URL_KEY.test(k) && typeof o[k] === "string" && o[k] && o[k] !== "$direct") o[k] = scrubUrl(o[k] as string); };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function scrub(e: any) { if (!e) return e; for (const bag of [e.properties, e.$set, e.$set_once, e.properties?.$set, e.properties?.$set_once]) cleanBag(bag); if (e.properties) delete e.properties.title; return e; }
export const scrubEvent = scrub;
