import type { GuestHandoff } from "../isdead-auth/handoff";
import type { SaveStatus } from "../local-store";
import type { Design } from "./types";
import { isDesignLibrary } from "./validate";
import { BP } from "../basepath";
import { DesignConflict, type DesignRecord, type DesignRepository } from "./repository";
import { fingerprintDesign } from "./content-hash";

type Memory = { value: unknown; status: SaveStatus } | undefined;
type ReadMemory = (namespace: string) => Memory;
const dirty = (snapshot: Memory) => snapshot?.status === "saving" || snapshot?.status === "unsaved" || snapshot?.status === "conflict";
function library(value: unknown, label: string): Design[] {
  if (!isDesignLibrary(value)) {
    throw new Error(`${label} designs could not be read. Saved data has not been replaced.`);
  }
  return value;
}
async function read(repository: DesignRepository, owner: string, label: string) {
  let saved: DesignRecord;
  try { saved = await repository.read(owner); }
  catch { throw new Error(`${label} designs could not be read. Restore browser storage access and retry; saved designs have not been changed.`); }
  library(saved.value, label); return saved;
}
const sameRevision = (a: DesignRecord, b: DesignRecord) => a.revision === b.revision && a.legacy === b.legacy;
// The design store publishes immutable arrays on edits. Keep their identity instead of
// serializing pending artwork; any intervening edit/save requires another attempt.
const pending = (snapshot: Memory) => dirty(snapshot) ? snapshot?.value : null;

/** Copy a snapshot locally; never delete guest data or overwrite an existing account design.
 * Content-derived IDs make retries idempotent, even if an imported copy has since been edited.
 * A changed guest version becomes another copy. This is not cross-tab live synchronization.
 */
export async function copyGuestDesigns(repository: DesignRepository, handoff: GuestHandoff, readMemory: ReadMemory = () => undefined, progress: (complete: number, total: number) => void = () => {}) {
  const { guestId, accountId } = handoff;
  if (!/^g_[A-Za-z0-9_-]{10,40}$/.test(guestId) || !accountId || accountId.length > 128) throw new Error("Invalid local design handoff.");
  if (guestId === accountId) return { copied: 0, designIds: new Map<string, string>() };
  const memory = pending(readMemory(guestId));
  const source = await read(repository, guestId, "Guest");
  const candidates = memory === null ? source.value : [...source.value, ...library(memory, "Unsaved guest")];
  const copies = new Map<string, Design>(), designIds = new Map<string, string>();
  progress(0, candidates.length);
  for (const [index, design] of candidates.entries()) {
    const id = await fingerprintDesign(guestId, design);
    copies.set(id, { ...design, id });
    designIds.set(design.id, id); // Prefer this tab's unsaved version for the editor return link.
    progress(index + 1, candidates.length);
  }
  const checkMemory = () => {
    if (pending(readMemory(guestId)) !== memory) throw new Error("Guest designs changed while copying. Retry to include the latest edits.");
    if (dirty(readMemory(accountId))) throw new Error("This account has unsaved edits in this tab. Download the account backup before reloading.");
  };
  const checkSource = async () => {
    if (!sameRevision(await read(repository, guestId, "Guest"), source)) throw new Error("Guest designs changed while copying. Retry to include the latest edits.");
    checkMemory();
  };
  await checkSource();
  let target = await read(repository, accountId, "Account"); checkMemory();
  const ids = new Set(target.value.map(design => design.id));
  const additions = [...copies.values()].filter(design => !ids.has(design.id));
  if (additions.length) {
    try { target = await repository.write(accountId, target, [...additions, ...target.value]); }
    catch (error) {
      if (error instanceof DesignConflict) throw new Error("Account designs changed in another tab. Retry copying.");
      throw new Error("Browser storage could not save the copies. Download backups, make storage space available, then retry. The original libraries are unchanged.");
    }
  }
  await checkSource();
  if (!sameRevision(await read(repository, accountId, "Account"), target)) throw new Error("Account designs changed in another tab. Retry copying.");
  checkMemory();
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
