// Analytics taxonomy for the shared IsDead PostHog project 666931 (contract: yourappisdead/ANALYTICS.md, see docs/ANALYTICS.md).
// Super properties: product (this app's slug), surface ("landing" = logged-out marketing pages, "app" = the working product
// and anything it publishes), platform ("web"). Page views are PostHog's built-in $pageview.
// Events are `app_<object>_<action>` (or `landing_<object>_<action>` for marketing CTAs); the product name lives in
// `product`, never in an event name. Never send user content (titles, URLs, emails, text) as properties: CanvaIsDead
// sends fixed enums only (no design ids, names, artwork, file names, counts of private data or raw errors).
export const APP = "canvaisdead" as const;
export type Surface = "landing" | "app";
export const EVENTS = {
  // ---- account ----
  app_auth_started: "app_auth_started",   // method ("password" | "google"), flow ("signin" | "signup" | "reset" | "signin_or_signup")
  app_auth_failed: "app_auth_failed",     // method, flow (no error text)
  app_signed_up: "app_signed_up",         // method ("password")
  app_signed_in: "app_signed_in",         // method ("password" | "google")
  app_signed_out: "app_signed_out",
  app_password_reset_requested: "app_password_reset_requested",
  // ---- designs (library + editor) ----
  app_design_created: "app_design_created",   // origin ("blank" | "template" | "copy")
  app_design_renamed: "app_design_renamed",
  app_design_trashed: "app_design_trashed",
  app_design_restored: "app_design_restored",
  app_design_deleted: "app_design_deleted",
  app_design_starred: "app_design_starred",   // starred (bool), origin ("library" | "editor")
  app_design_exported: "app_design_exported", // format ("png" | "jpg" | "svg" | "pdf_standard" | "pdf_print")
  app_design_export_failed: "app_design_export_failed", // format
  app_template_applied: "app_template_applied",
  app_project_pages_applied: "app_project_pages_applied", // placement ("replace" | "add"), selection ("single" | "multiple")
  app_backup_completed: "app_backup_completed", // action ("import" | "download"), library ("designs" | "uploads")
  app_backup_failed: "app_backup_failed",       // action, library
} as const;
export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
// Allowlist of properties per event, with their only permitted values. track() rebuilds the properties from this list, so a
// caller can't leak a design name, id or file name by passing extra fields; an out-of-list value drops the whole event.
const auth = { method: ["password", "google"], flow: ["signin", "signup", "reset", "signin_or_signup"] } as const;
const format = { format: ["png", "jpg", "svg", "pdf_standard", "pdf_print"] } as const;
const backup = { action: ["import", "download"], library: ["designs", "uploads", undefined] } as const;
type Allowed = Record<string, readonly (string | boolean | undefined)[]>;
const ALLOWED: Record<EventName, Allowed> = {
  app_auth_started: auth, app_auth_failed: auth, app_signed_up: { method: ["password"] }, app_signed_in: { method: ["password", "google"] },
  app_signed_out: {}, app_password_reset_requested: {},
  app_design_created: { origin: ["blank", "template", "copy"] }, app_design_renamed: {}, app_design_trashed: {}, app_design_restored: {}, app_design_deleted: {},
  app_design_starred: { starred: [true, false], origin: ["library", "editor"] },
  app_design_exported: format, app_design_export_failed: format, app_template_applied: {},
  app_project_pages_applied: { placement: ["replace", "add"], selection: ["single", "multiple"] },
  app_backup_completed: backup, app_backup_failed: backup,
};
/** The allowlisted copy of `input` for `event`, or null when a value is outside the list (the event is then dropped). */
export function safeProps(event: string, input: unknown = {}): Record<string, string | boolean> | null {
  if (!Object.hasOwn(ALLOWED, event) || !input || typeof input !== "object") return null;
  const out: Record<string, string | boolean> = {};
  for (const [key, allowed] of Object.entries(ALLOWED[event as EventName])) {
    const v = (input as Record<string, unknown>)[key];
    if (!allowed.includes(v as never)) return null;
    if (v !== undefined) out[key] = v as string | boolean;
  }
  return out;
}
export const EVENT_PREFIXES = ["app_", "landing_"] as const;
/** Super properties every event carries (yourappisdead/ANALYTICS.md §1). */
export const superProps = (surface: Surface) => ({ product: APP, surface, platform: "web" as const });
/** Super properties older IsDead taxonomies persisted in the shared yourappisdead.com cookie. Unregistered at boot. */
export const LEGACY_PROPS = ["app", "app_family", "base_path", "suite_id", "app_id", "schema_version", "source", "site_id", "environment"] as const;
