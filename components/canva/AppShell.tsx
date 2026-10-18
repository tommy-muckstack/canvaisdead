"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { identify, resetIdentity, track, EVENTS } from "@/lib/analytics";
import { Ic } from "./Ic";
import { BP } from "@/lib/basepath";
import { GuestDesignHandoff } from "@/components/GuestDesignHandoff";
import type { SessionUser } from "@/lib/session";
import { CreateDesignTrigger, DesignCreationProvider } from "./DesignCreation";
const NAV: [string, string, string, string?][] = [["CanvaIsDead AI", "ai", "/app"], ["Home", "home", "/app"], ["Projects", "folder", "/app/projects"], ["Templates", "tpl", "/app/templates"], ["Brand", "crown", "/app"], ["Print Shop", "print", "/app"], ["More", "more", "/app"]];
export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const path = (usePathname() || "").replace(BP, "");
  // Signed-in accounts are identified by Firebase uid; guests and the demo account stay anonymous.
  useEffect(() => { identify(user.id, user.guest ? "guest" : user.demo ? "demo" : "firebase"); }, [user.id, user.guest, user.demo]);
  if (user.pendingGuestId) return <GuestDesignHandoff key={`${user.pendingGuestId}:${user.id}`} handoff={{ guestId: user.pendingGuestId, accountId: user.id }} />;
  if (path.startsWith("/app/design")) return <>{children}</>;
  const cur = path.startsWith("/app/projects") ? "Projects" : path.startsWith("/app/templates") ? "Templates" : "Home";
  return <DesignCreationProvider key={`${user.id}:${path}`} uid={user.id}><div className="cx"><nav className="cx-rail" aria-label="Main">
    <button className="cx-rail__tog" aria-label="Collapse sidebar"><Ic n="sidebar" s={18} /></button>
    <CreateDesignTrigger />
    {NAV.map(([l, i, h]) => <Link key={l} href={h} className={"cx-rail__i" + (l === cur ? " on" : "") + (l === "CanvaIsDead AI" ? " ai" : "") + (l === "Home" ? " home" : "")}><span><Ic n={i} s={24} /></span>{l}</Link>)}
    <div className="cx-rail__sp" />
    <button className="cx-rail__i cx-rail__bell" aria-label="Notifications"><span><Ic n="bell" s={20} /></span></button>
    {user.guest ? <Link className="cx-guest-signin" href={`/login?callbackUrl=${encodeURIComponent(path)}`} title="Guest · designs saved in this browser">Sign in</Link> : <form method="post" action={`${BP}/api/session/logout`} onSubmit={() => { track(EVENTS.app_signed_out); resetIdentity(); }}><button className="cx-av" title="Sign out" aria-label="Sign out">{(user.demo ? "D" : (user.name || user.email || "T")[0]).toUpperCase()}{!user.demo && ((user.name || "").split(" ")[1]?.[0] ?? "").toUpperCase()}</button></form>}
  </nav>
  <div className="cx-main">{children}<button className="cx-help" aria-label="Help">?</button></div></div></DesignCreationProvider>;
}
