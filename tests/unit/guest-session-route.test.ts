import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { HANDOFF_ACCOUNT_HEADER, HANDOFF_GUEST_HEADER, readGuestHandoff } from "@/lib/isdead-auth/handoff";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(), createSession: vi.fn(), configured: vi.fn(), verifyGuest: vi.fn(), guestEnabled: vi.fn(), adoptGuestDocs: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser }));
vi.mock("@/lib/store", () => ({ adoptGuestDocs: mocks.adoptGuestDocs }));
vi.mock("@/lib/isdead-auth/server", () => ({
  createSessionFromIdToken: mocks.createSession, firebaseConfigured: mocks.configured, verifyGuest: mocks.verifyGuest,
  guestEnabled: mocks.guestEnabled, SESSION_COOKIE: "isdead_session", DEMO_COOKIE: "isdead_demo", GUEST_COOKIE: "isdead_guest", GUEST_MAX_AGE_S: 15552000,
  cookieOptions: (maxAge = 1209600) => ({ httpOnly: true, sameSite: "lax", path: "/", maxAge }),
  newGuestId: () => "g_abcdefghijklmnop", signGuest: (id: string) => `${id}.test-signature`,
}));
import { POST } from "@/app/api/session/route";
import { GET, DELETE } from "@/app/api/session/guest/route";

const guestId = "g_abcdefghijklmnop", accountId = "account one/verified";
const headers = { [HANDOFF_GUEST_HEADER]: guestId, [HANDOFF_ACCOUNT_HEADER]: encodeURIComponent(accountId) };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.configured.mockReturnValue(true);
  mocks.guestEnabled.mockReturnValue(true);
  mocks.verifyGuest.mockReturnValue(guestId);
  mocks.createSession.mockResolvedValue({ cookie: "test-session", identity: { uid: accountId } });
  mocks.currentUser.mockResolvedValue({ id: accountId, guest: false, demo: false, pendingGuestId: guestId });
});
const sessionRequest = (idToken: unknown = "test-id-token") => new NextRequest("http://localhost/canvaisdead/api/session", { method: "POST", headers: { cookie: "isdead_guest=signed-test-cookie", "content-type": "application/json" }, body: JSON.stringify({ idToken }) });
const acknowledgment = (nextHeaders = headers) => new NextRequest("http://localhost/canvaisdead/api/session/guest", { method: "DELETE", headers: nextHeaders });

describe("guest-to-account session protocol", () => {
  it("returns only verified identity metadata and retains the guest cookie until local copy succeeds", async () => {
    const response = await POST(sessionRequest());
    expect(response.status).toBe(204);
    expect(readGuestHandoff(response.headers)).toEqual({ guestId, accountId });
    expect(response.cookies.get("isdead_session")?.value).toBe("test-session");
    expect(response.cookies.get("isdead_guest")).toBeUndefined();
    expect(response.cookies.get("isdead_demo")?.value).toBe("");
    expect(mocks.adoptGuestDocs).not.toHaveBeenCalled();
    expect(await response.text()).toBe("");
  });

  it("does not create a local handoff for missing/forged guest cookies", async () => {
    mocks.verifyGuest.mockReturnValue(null);
    const response = await POST(sessionRequest());
    expect(response.status).toBe(204);
    expect(readGuestHandoff(response.headers)).toBeNull();
    expect(mocks.adoptGuestDocs).not.toHaveBeenCalled();
  });

  it("does not acknowledge auth failures or invalid tokens", async () => {
    expect((await POST(sessionRequest(null))).status).toBe(400);
    mocks.createSession.mockRejectedValue(new Error("Invalid token"));
    const response = await POST(sessionRequest());
    expect(response.status).toBe(401);
    expect(response.cookies.getAll()).toEqual([]);
    expect(readGuestHandoff(response.headers)).toBeNull();
  });

  it("clears the guest cookie only for the current verified pair and safely repeats acknowledgment", async () => {
    const response = await DELETE(acknowledgment());
    expect(response.status).toBe(204);
    expect(response.cookies.get("isdead_guest")).toMatchObject({ value: "", maxAge: 0 });
    mocks.currentUser.mockResolvedValue({ id: accountId, guest: false, demo: false });
    expect((await DELETE(acknowledgment())).status).toBe(204);
  });

  it.each([null, { id: guestId, guest: true }, { id: "demo", demo: true }])("rejects acknowledgments without an account session: %j", async user => {
    mocks.currentUser.mockResolvedValue(user);
    const response = await DELETE(acknowledgment());
    expect(response.status).toBe(401);
    expect(response.cookies.getAll()).toEqual([]);
  });

  it("does not clear another guest or account's session", async () => {
    for (const changed of [{ id: "another-account", pendingGuestId: guestId }, { id: accountId, pendingGuestId: "g_anotherguestvalue" }]) {
      mocks.currentUser.mockResolvedValue(changed);
      const response = await DELETE(acknowledgment());
      expect(response.status).toBe(409);
      expect(response.cookies.getAll()).toEqual([]);
    }
  });

  it("rejects incomplete acknowledgment headers", async () => {
    expect((await DELETE(acknowledgment({ [HANDOFF_GUEST_HEADER]: guestId, [HANDOFF_ACCOUNT_HEADER]: "" }))).status).toBe(400);
  });
});

describe("guest entry", () => {
  it("creates a guest without a database call and stays under the app base path", async () => {
    mocks.currentUser.mockResolvedValue(null);
    const response = await GET(new NextRequest("http://localhost/canvaisdead/api/session/guest?next=/app/projects"));
    expect(response.headers.get("location")).toBe("/canvaisdead/app/projects");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.cookies.get("isdead_guest")?.value).toBe(`${guestId}.test-signature`);
    expect(mocks.adoptGuestDocs).not.toHaveBeenCalled();
  });

  it("keeps existing sessions and rejects off-site redirect targets", async () => {
    const response = await GET(new NextRequest("http://localhost/canvaisdead/api/session/guest?next=//example.com"));
    expect(response.headers.get("location")).toBe("/canvaisdead/app");
    expect(response.cookies.getAll()).toEqual([]);
  });

  it("honors disabled guest sessions without minting a cookie", async () => {
    mocks.guestEnabled.mockReturnValue(false);
    const response = await GET(new NextRequest("http://localhost/canvaisdead/api/session/guest?next=/app/projects"));
    expect(response.headers.get("location")).toBe("/canvaisdead/login?callbackUrl=%2Fapp%2Fprojects");
    expect(response.cookies.getAll()).toEqual([]);
  });
});
