"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { FirebaseClientConfig } from "@/lib/isdead-auth/config";
import { signInWithGoogle, authErrorMessage } from "@/lib/isdead-auth/client";
import { BP } from "@/lib/basepath";
import { LoginForm } from "@/components/LoginForm";
import { Logo } from "@/components/Logo";

type Tile = { c: string; fg: string; t: string; s?: string; h: number };
const COLS: Tile[][] = [
  [{ c: "#f6d7e4", fg: "#7a1d4e", t: "Brand identity", h: 190 }, { c: "#1d2d6b", fg: "#fff", t: "STUDIO", h: 150 }, { c: "#f4efe3", fg: "#222", t: "Our services", s: "Design · Strategy", h: 210 }, { c: "#c9e8d8", fg: "#124d36", t: "What does a team do?", h: 170 }],
  [{ c: "#0f1f2b", fg: "#fff", t: "2040", s: "Vision report", h: 160 }, { c: "#fff", fg: "#111", t: "Monthly performance report", h: 230 }, { c: "#e2e0ff", fg: "#2d1b8e", t: "Campaign strategy", h: 190 }, { c: "#f9e1b4", fg: "#5b3600", t: "Annual report", h: 160 }],
  [{ c: "#d7ecff", fg: "#0b3a63", t: "Go-to-Market plan", h: 220 }, { c: "#fff", fg: "#222", t: "Digital marketing", s: "Brand guidelines", h: 200 }, { c: "#7c3aed", fg: "#fff", t: "Brand Guidelines", h: 180 }, { c: "#fde2e2", fg: "#8a1c1c", t: "Sale", s: "Up to 50% off", h: 170 }],
  [{ c: "#ffd6a8", fg: "#5e2b00", t: "Pre-Order Now", h: 210 }, { c: "#0d4d3f", fg: "#fff", t: "Create a better future for others", h: 200 }, { c: "#fff", fg: "#111", t: "Manager training essentials", h: 190 }, { c: "#2b2b3a", fg: "#fff", t: "Sales Pitch Deck", h: 160 }],
  [{ c: "#e9f2d0", fg: "#2f4a0c", t: "New benefits", h: 180 }, { c: "#2a2a6e", fg: "#fff", t: "Schedule of events", h: 230 }, { c: "#ffe8f1", fg: "#7a1d4e", t: "Open house", h: 170 }, { c: "#d8f3f0", fg: "#0b4a45", t: "Course outline", h: 190 }],
];
function Backdrop() {
  return <div className="cvl-bg" aria-hidden>{COLS.map((col, i) => <div key={i} className="cvl-col" style={{ marginTop: (i % 2 ? -150 : -40) - i * 8 }}>{col.concat(col).map((t, j) => <div key={j} className="cvl-tile" style={{ background: t.c, color: t.fg, height: t.h }}><b>{t.t}</b>{t.s && <span>{t.s}</span>}<i /><i /></div>)}</div>)}<div className="cvl-dim" /></div>;
}
const Icon = ({ d, fill }: { d: string; fill?: string }) => <svg width="18" height="18" viewBox="0 0 24 24" fill={fill ?? "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>;

export function CvLogin({ config, demo, to }: { config: FirebaseClientConfig | null; demo: boolean; to: string }) {
  const [step, setStep] = useState<"choose" | "email">("choose");
  const [err, setErr] = useState(""); const [ck, setCk] = useState(false);
  useEffect(() => { setCk(!localStorage.getItem("canvaisdead:cookies")); }, []);
  const okCk = () => { localStorage.setItem("canvaisdead:cookies", "1"); setCk(false); };
  const google = async () => { setErr(""); try { await signInWithGoogle(config!, `${BP}/api/session`); window.location.assign(to); } catch (e) { setErr(authErrorMessage(e)); } };
  const off = "Not available yet in the open-source version";
  return <main className="cvl">
    <Backdrop />
    <header className="cvl-top"><Link href="/" className="cvl-logo"><Logo size={26} /></Link>
      <nav>{["Design", "Product", "Plans", "Business", "Education", "Help"].map(n => <Link key={n} href="/#features">{n}</Link>)}</nav></header>
    <section className="cvl-modal">
      {step === "choose" ? <>
        <h1>Log in or sign up in seconds</h1>
        <p className="cvl-sub">Use your email or another service to continue with {`CanvaIsDead`} (it&apos;s free)!</p>
        {!config && <p role="status" className="cvl-note">Sign-in not configured. Email and Google sign-in turn on once Firebase is set up.</p>}
        <div className="cvl-btns">
          <button type="button" disabled={!config} onClick={google}><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><path fill="#4285F4" d="M23 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h6.2a5.3 5.3 0 01-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.4z" /><path fill="#34A853" d="M12 23.5c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3A11.5 11.5 0 0012 23.5z" /><path fill="#FBBC05" d="M5.6 14.2a6.9 6.9 0 010-4.4v-3H1.8a11.5 11.5 0 000 10.4z" /><path fill="#EA4335" d="M12 5.4c1.7 0 3.2.6 4.4 1.7l3.3-3.3A11.5 11.5 0 001.8 6.8l3.8 3A6.9 6.9 0 0112 5.4z" /></svg><span>Continue with Google</span></button>
          <button type="button" disabled title={off}><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="11" fill="#1877f2" /><path d="M13.2 20v-6.900h2.300l.4-2.700h-2.700V8.700c0-.8.2-1.300 1.300-1.300H16V5a18 18 0 00-2-.1c-2 0-3.400 1.200-3.400 3.500v2h-2.300v2.700h2.300V20z" fill="#fff" /></svg><span>Continue with Facebook</span></button>
          <button type="button" onClick={() => setStep("email")}><Icon d="M3 6h18v12H3zM3 7l9 6 9-6" /><span>Continue with email</span></button>
        </div>
        <button type="button" className="cvl-link" disabled title={off}>Continue another way</button>
        <p className="cvl-legal">By continuing, you agree to this site&apos;s <a href="#">Terms of Use</a>. Read our <a href="#">Privacy Policy</a>.</p>
        <hr />
        <button type="button" className="cvl-work" disabled title={off}><Icon d="M4 21V5l8-2v18M12 9h8v12M7 9h2M7 13h2M7 17h2" /> Continue with work email</button>
        {err && <p role="alert" className="cvl-err">{err}</p>}
        {demo && <button type="button" className="cvl-demo" onClick={async () => { const r = await fetch(`${BP}/api/session/demo`, { method: "POST" }); if (r.ok) window.location.assign(to); }}>Use the demo account</button>}
      </> : <>
        <button type="button" className="cvl-back" onClick={() => setStep("choose")}>← All sign-in options</button>
        <LoginForm config={config} demo={false} to={to} />
      </>}
    </section>
    {ck && <aside className="cvl-ck" role="dialog" aria-label="Cookies"><b>But first, cookies 🍪</b><p>We use essential cookies to make this app work. We&apos;d like to use other cookies to improve and personalize your visit. Learn more about your choices in our cookie policy.</p><button type="button" onClick={okCk}>Accept all cookies</button><button type="button" className="g" onClick={okCk}>Manage cookies</button></aside>}
  </main>;
}
