import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { BP } from "@/lib/basepath";
import { GUEST_COOKIE, GUEST_MAX_AGE_S, cookieOptions, guestEnabled, newGuestId, signGuest } from "@/lib/isdead-auth/server";
import { readGuestHandoff } from "@/lib/isdead-auth/handoff";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// GET ?next=/app → mint a guest session (if there is no session yet) and bounce back into the app.
// Relative Location on purpose: behind the yourappisdead.com rewrite this function sees its own
// *.vercel.app origin, and an absolute redirect would carry the visitor off the public domain.
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("next") || "/app";
  const next = /^\/(?!\/)[\w\-./?=&%]*$/.test(raw) ? raw : "/app";
  const go = (path: string) => new NextResponse(null, { status: 307, headers: { Location: BP + path, "Cache-Control": "no-store" } });
  if (!guestEnabled()) return go("/login?callbackUrl=" + encodeURIComponent(next));
  const res = go(next);
  if (!(await currentUser())) res.cookies.set(GUEST_COOKIE, signGuest(newGuestId()), cookieOptions(GUEST_MAX_AGE_S));
  return res;
}

/** Acknowledge a successful local copy. Only the verified account/guest pair may clear it. */
export async function DELETE(req: NextRequest) {
  const user = await currentUser();
  if (!user || user.guest || user.demo) return NextResponse.json({ error: "Sign in to finish copying guest designs." }, { status: 401 });
  let handoff;
  try { handoff = readGuestHandoff(req.headers); } catch { return NextResponse.json({ error: "Invalid handoff." }, { status: 400 }); }
  if (!handoff || handoff.accountId !== user.id || (user.pendingGuestId && handoff.guestId !== user.pendingGuestId)) {
    return NextResponse.json({ error: "The signed-in account changed. Reload to continue safely." }, { status: 409 });
  }
  const res = new NextResponse(null, { status: 204 });
  res.cookies.set(GUEST_COOKIE, "", cookieOptions(0));
  return res;
}
