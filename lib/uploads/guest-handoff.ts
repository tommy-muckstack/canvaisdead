import type { GuestHandoff } from "../isdead-auth/handoff";
import { expiredUpload, validUpload, type Upload } from "./model";
import type { UploadReceipt, UploadTransferRepository } from "./repository";
import type { UploadStore } from "./store";

type StoreLookup = (owner: string) => UploadStore | undefined;
type Progress = (complete: number, total: number) => void;
const changed = () => Error("Guest uploads changed while copying. Retry to include the latest files.");
const pending = () => Error("Some imports still need attention. Retry or skip the failed imports below, then retry copying. Your original files have not been changed.");
const hex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer), n => n.toString(16).padStart(2, "0")).join("");
export async function guestUploadReceipt(guestId: string, item: Upload): Promise<UploadReceipt> {
  if (!/^g_[A-Za-z0-9_-]{10,40}$/.test(guestId) || !validUpload(item)) throw Error("Invalid guest upload data.");
  if (!globalThis.crypto?.subtle) throw Error("Open this site over HTTPS to copy uploads safely. Your originals have not been changed.");
  // Originals have a 50 MiB cap. Hash one at a time; never serialize a whole library or change bytes.
  const original = hex(await crypto.subtle.digest("SHA-256", await item.original.arrayBuffer()));
  const thumbnail = hex(await crypto.subtle.digest("SHA-256", await item.thumbnail.arrayBuffer()));
  const content = ["canvaisdead-guest-upload-v1", guestId, item.id, item.name, item.mime, item.width, item.height, item.createdAt, item.updatedAt, item.trashedAt ?? null, original, thumbnail];
  const fingerprint = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(content))));
  return { version: 1, id: `guest-upload-${fingerprint}`, guestId, sourceId: item.id, fingerprint };
}

/** Individual asset + receipt commits are atomic; a partially completed transfer safely resumes.
 * The source snapshot is read-only. Expired Trash is skipped without deleting guest records.
 */
export async function copyGuestUploads(handoff: GuestHandoff, source: UploadTransferRepository, target: UploadTransferRepository, memory: StoreLookup = () => undefined, progress: Progress = () => {}, notify: () => void = () => {}) {
  const { guestId, accountId } = handoff;
  if (!/^g_[A-Za-z0-9_-]{10,40}$/.test(guestId) || !accountId || accountId.length > 128 || guestId === accountId) throw Error("Invalid local upload handoff.");
  for (const owner of [guestId, accountId]) if (await memory(owner)?.settle() === false) throw pending();
  // Validate both libraries before copying. Otherwise an unreadable account asset could
  // hide every new copy after sign-in, even though its individual insert committed.
  const [snapshot] = await Promise.all([source.snapshot(), target.snapshot()]);
  const now = Date.now(), items = snapshot.assets.filter(item => !expiredUpload(item, now));
  const assertCurrent = async () => {
    if (memory(guestId)?.pending() || memory(accountId)?.pending()) throw pending();
    if (await source.revision() !== snapshot.revision) throw changed();
    if (memory(guestId)?.pending() || memory(accountId)?.pending()) throw pending();
  };
  let copied = 0, complete = 0;
  progress(0, items.length);
  for (const item of items) {
    const receipt = await guestUploadReceipt(guestId, item);
    await assertCurrent();
    if (await target.adopt({ ...item, id: receipt.id }, receipt)) { copied++; try { notify(); } catch { /* Local copy has already committed. */ } }
    progress(++complete, items.length);
  }
  await assertCurrent();
  return { copied, assertCurrent };
}

/** Keep acknowledgment behind both local copies and the final upload revision/pending-work check. */
export async function transferGuestWorkspace<T>(uploads: () => Promise<{ assertCurrent: () => Promise<void> }>, designs: () => Promise<T>, acknowledge: () => Promise<void>) {
  const files = await uploads(), result = await designs();
  await files.assertCurrent();
  await acknowledge();
  return result;
}
