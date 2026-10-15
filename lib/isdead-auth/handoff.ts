/** Same-origin session metadata only; design contents never enter the auth protocol. */
export const HANDOFF_GUEST_HEADER = "x-isdead-previous-guest";
export const HANDOFF_ACCOUNT_HEADER = "x-isdead-account";
export type GuestHandoff = { guestId: string; accountId: string };

export function readGuestHandoff(headers: Headers): GuestHandoff | null {
  const guest = headers.get(HANDOFF_GUEST_HEADER), account = headers.get(HANDOFF_ACCOUNT_HEADER);
  if (!guest && !account) return null;
  try {
    const guestId = decodeURIComponent(guest ?? ""), accountId = decodeURIComponent(account ?? "");
    if (/^g_[A-Za-z0-9_-]{10,40}$/.test(guestId) && accountId.length > 0 && accountId.length <= 128) return { guestId, accountId };
  } catch { /* An incomplete handoff must not navigate away from unsaved browser edits. */ }
  throw new Error("Sign-in finished, but the local design handoff could not be confirmed. Keep this tab open and try again.");
}

/** Acknowledge metadata only, after the local copy. Bound network failure so recovery stays reachable. */
export async function acknowledgeGuestHandoff(url: string, handoff: GuestHandoff, send: typeof fetch = fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await send(url, { method: "DELETE", credentials: "same-origin", signal: controller.signal, headers: {
      [HANDOFF_GUEST_HEADER]: encodeURIComponent(handoff.guestId),
      [HANDOFF_ACCOUNT_HEADER]: encodeURIComponent(handoff.accountId),
    } });
    if (!response.ok) {
      const detail = await response.json().catch(() => null);
      throw new Error(typeof detail?.error === "string" ? detail.error : "Your designs were copied locally, but confirmation failed. Retry; existing copies will be kept.");
    }
  } catch (error) {
    if (controller.signal.aborted) throw new Error("Your designs were copied locally, but confirmation timed out. Check your connection and retry.");
    if (error instanceof TypeError) throw new Error("Your designs were copied locally, but confirmation could not reach the server. Check your connection and retry.");
    throw error;
  } finally { clearTimeout(timeout); }
}
