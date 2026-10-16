// Shared website contract. Other IsDead apps keep these names and set their own app_id.
export type WebsiteEvents = {
  website_page_viewed: Record<string, never>;
  website_auth_started: { method: "google" | "email"; flow: "signin" | "signup" | "reset" | "signin_or_signup" };
  website_auth_completed: WebsiteEvents["website_auth_started"];
  website_auth_failed: WebsiteEvents["website_auth_started"];
  website_design_created: { source: "blank" | "template" | "copy" };
  website_design_deleted: Record<string, never>;
  website_design_renamed: Record<string, never>;
  website_design_trashed: Record<string, never>;
  website_design_restored: Record<string, never>;
  website_template_applied: Record<string, never>;
  website_export_completed: { format: "png" | "jpg" | "svg" | "pdf_standard" | "pdf_print" };
  website_export_failed: WebsiteEvents["website_export_completed"];
  website_backup_completed: { action: "import" | "download"; library?: "designs" | "uploads" };
  website_backup_failed: WebsiteEvents["website_backup_completed"];
};
export type WebsiteEvent = keyof WebsiteEvents;
const auth = { method: ["google", "email"], flow: ["signin", "signup", "reset", "signin_or_signup"] };
const format = { format: ["png", "jpg", "svg", "pdf_standard", "pdf_print"] };
const backup = { action: ["import", "download"] };
const rules: Record<WebsiteEvent, Record<string, readonly string[]>> = {
  website_page_viewed: {}, website_auth_started: auth, website_auth_completed: auth, website_auth_failed: auth,
  website_design_created: { source: ["blank", "template", "copy"] }, website_design_deleted: {}, website_design_renamed: {}, website_design_trashed: {}, website_design_restored: {}, website_template_applied: {},
  website_export_completed: format, website_export_failed: format, website_backup_completed: backup, website_backup_failed: backup,
};
// Build a fresh allowlisted object even if an untyped caller supplies extra data.
export function eventProperties(event: string, input: unknown): Record<string, string> | null {
  if (!Object.hasOwn(rules, event) || !input || typeof input !== "object") return null;
  const result: Record<string, string> = {};
  for (const [key, allowed] of Object.entries(rules[event as WebsiteEvent])) {
    const value = (input as Record<string, unknown>)[key];
    if (typeof value !== "string" || !allowed.includes(value)) return null;
    result[key] = value;
  }
  if (event === "website_backup_completed" || event === "website_backup_failed") {
    const library = (input as Record<string, unknown>).library;
    if (library !== undefined) {
      if (library !== "designs" && library !== "uploads") return null;
      result.library = library;
    }
  }
  return result;
}
export function routeContext(path: string, basePath: string) {
  let route = path.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  if (basePath && (route === basePath || route.startsWith(basePath + "/"))) route = route.slice(basePath.length) || "/";
  if (route === "/") return { surface: "marketing", route: "/" };
  if (route === "/login") return { surface: "auth", route };
  if (route === "/app") return { surface: "dashboard", route };
  if (route === "/app/projects") return { surface: "projects", route };
  if (route === "/app/templates") return { surface: "templates", route };
  if (/^\/app\/design\/[^/]+\/present$/.test(route)) return { surface: "presentation", route: "/app/design/:id/present" };
  if (/^\/app\/design\/[^/]+$/.test(route)) return { surface: "editor", route: "/app/design/:id" };
  return { surface: "other", route: "other" };
}
