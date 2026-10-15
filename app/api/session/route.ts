import { NextRequest, NextResponse } from "next/server";
import { createSessionFromIdToken, firebaseConfigured, SESSION_COOKIE, DEMO_COOKIE, GUEST_COOKIE, verifyGuest, cookieOptions } from "@/lib/isdead-auth/server";
import { HANDOFF_GUEST_HEADER, HANDOFF_ACCOUNT_HEADER } from "@/lib/isdead-auth/handoff";
export const runtime = "nodejs";
// POST { idToken } → verifies with firebase-admin and sets the shared session cookie (path "/", so one sign-in covers every IsDead app).
export async function POST(req: NextRequest) {
  if (!firebaseConfigured()) return NextResponse.json({ error: "Sign-in is not configured yet." }, { status: 503 });
  const { idToken } = await req.json().catch(() => ({}));
  if (typeof idToken !== "string" || !idToken) return NextResponse.json({ error: "idToken required" }, { status: 400 });
  let s; try { s = await createSessionFromIdToken(idToken); } catch { return NextResponse.json({ error: "Sign-in failed. Try again." }, { status: 401 }); }
  // Verify the guest identity before offering a browser-local copy into the account's library.
  const guest = verifyGuest(req.cookies.get(GUEST_COOKIE)?.value);
  const res = new NextResponse(null, { status: 204 });
  // Designs stay in browser storage. Keep the guest cookie until the browser confirms the copy.
  if (guest) {
    res.headers.set(HANDOFF_GUEST_HEADER, encodeURIComponent(guest));
    res.headers.set(HANDOFF_ACCOUNT_HEADER, encodeURIComponent(s.identity.uid));
  }
  res.cookies.set(SESSION_COOKIE, s.cookie, cookieOptions());
  res.cookies.set(DEMO_COOKIE, "", cookieOptions(0));
  return res;
}
