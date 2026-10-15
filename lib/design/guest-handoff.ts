import type { GuestHandoff } from "../isdead-auth/handoff";
import type { SaveStatus } from "../local-store";
import type { Design } from "./types";
import { isDesignLibrary } from "./validate";
import { BP } from "../basepath";

type StorageAccess = Pick<Storage, "getItem" | "setItem">;
type Memory = { value: unknown; status: SaveStatus } | undefined;
type ReadMemory = (namespace: string) => Memory;
export const designStorageKey = (namespace: string) => `canvaisdead:${namespace}:designs`;
const dirty = (snapshot: Memory) => snapshot?.status === "unsaved" || snapshot?.status === "conflict";
function read(storage: StorageAccess, key: string) {
  try { return storage.getItem(key); }
  catch { throw new Error("Browser storage is unavailable. Restore storage access and retry; saved designs have not been changed."); }
}

function library(value: unknown, label: string): Design[] {
  if (!isDesignLibrary(value) || new Set(value.map(design => design.id)).size !== value.length) {
    throw new Error(`${label} designs could not be read. Saved data has not been replaced.`);
  }
  return value;
}
export function readGuestDesigns(raw: string | null): Design[] {
  try { return library(raw === null ? [] : JSON.parse(raw), "Guest"); }
  catch { throw new Error("Guest designs could not be read. Download the saved data for recovery; the original has not been changed."); }
}

// Sort object keys so harmless JSON key ordering changes cannot create duplicate copies.
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
}
const pending = (snapshot: Memory) => dirty(snapshot) ? canonical(snapshot?.value) : null;

/** Copy a snapshot locally; never delete guest data or overwrite an existing account design.
 * Content-derived IDs make retries idempotent, even if an imported copy has since been edited.
 * A changed guest version becomes another copy. This is not cross-tab live synchronization.
 */
export async function copyGuestDesigns(storage: StorageAccess, handoff: GuestHandoff, readMemory: ReadMemory = () => undefined) {
  const { guestId, accountId } = handoff;
  if (!/^g_[A-Za-z0-9_-]{10,40}$/.test(guestId) || !accountId || accountId.length > 128) throw new Error("Invalid local design handoff.");
  if (guestId === accountId) return { copied: 0, designIds: new Map<string, string>() };
  const sourceKey = designStorageKey(guestId), targetKey = designStorageKey(accountId);
  const sourceRaw = read(storage, sourceKey), source = readGuestDesigns(sourceRaw);
  const memory = readMemory(guestId), memoryRaw = pending(memory);
  const candidates = memoryRaw === null ? source : [...source, ...library(memory?.value, "Unsaved guest")];
  const copies = new Map<string, Design>(), designIds = new Map<string, string>();
  if (candidates.length && !globalThis.crypto?.subtle) throw new Error("Open this site over HTTPS to copy designs safely, or download a guest backup before leaving.");
  for (const design of candidates) {
    const bytes = new TextEncoder().encode(canonical({ guestId, design }));
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    const id = "guest-" + Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
    copies.set(id, { ...design, id });
    designIds.set(design.id, id); // Prefer this tab's unsaved version for the editor return link.
  }
  if (read(storage, sourceKey) !== sourceRaw || pending(readMemory(guestId)) !== memoryRaw) {
    throw new Error("Guest designs changed while copying. Retry to include the latest edits.");
  }
  if (dirty(readMemory(accountId))) throw new Error("This account has unsaved edits in this tab. Download the account backup before reloading.");
  const targetRaw = read(storage, targetKey);
  let existing: Design[];
  try { existing = library(targetRaw === null ? [] : JSON.parse(targetRaw), "Account"); }
  catch { throw new Error("Account designs could not be read. They have not been replaced; download the saved data for recovery."); }
  const ids = new Set(existing.map(design => design.id));
  const additions = [...copies.values()].filter(design => !ids.has(design.id));
  if (additions.length) {
    const next = JSON.stringify([...additions, ...existing]);
    if (read(storage, targetKey) !== targetRaw) throw new Error("Account designs changed in another tab. Retry copying.");
    try { storage.setItem(targetKey, next); } // One atomic write. Failure leaves both originals intact.
    catch { throw new Error("Browser storage could not save the copies. Download backups, make storage space available, then retry. The original libraries are unchanged."); }
    if (read(storage, targetKey) !== next) throw new Error("Account designs changed in another tab. Retry copying.");
  }
  return { copied: additions.length, designIds };
}

export function handoffDestination(to: string, designIds: Map<string, string>) {
  const prefix = `${BP}/app/design/`;
  if (!to.startsWith(prefix)) return to;
  const match = to.slice(prefix.length).match(/^([^/?#]+)(.*)$/);
  if (!match) return to;
  try {
    const id = designIds.get(decodeURIComponent(match[1]));
    return id ? prefix + encodeURIComponent(id) + match[2] : to;
  } catch { return to; }
}
