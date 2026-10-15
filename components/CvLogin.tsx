"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { FirebaseClientConfig } from "@/lib/isdead-auth/config";
import { signInWithGoogle, authErrorMessage } from "@/lib/isdead-auth/client";
import { BP } from "@/lib/basepath";
import { LoginForm } from "@/components/LoginForm";
import { Logo } from "@/components/Logo";
import { GoogleButton } from "@/vendor/isdead-design/src/google";

type Tile = { c: string; fg: string; t: string; s?: string; h: number; art?: "ghost" | "card" | "flower" };
const COLS: Tile[][] = [
  [{ c: "#f6d7e4", fg: "#7a1d4e", t: "SaaS is dead.", s: "Long live making stuff.", h: 190, art: "ghost" }, { c: "#1d2d6b", fg: "#fff", t: "REST IN PIXELS", h: 150 }, { c: "#f4efe3", fg: "#222", t: "Great design. Zero invoices.", h: 210, art: "card" }, { c: "#c9e8d8", fg: "#124d36", t: "Your wallet called. It says thanks.", h: 170 }],
  [{ c: "#0f1f2b", fg: "#fff", t: "$0", s: "Our entire business model.", h: 160 }, { c: "#fff", fg: "#111", t: "This could have been a subscription.", s: "Awkward.", h: 230, art: "ghost" }, { c: "#e2e0ff", fg: "#2d1b8e", t: "Cancel culture. But for SaaS.", h: 190 }, { c: "#f9e1b4", fg: "#5b3600", t: "Annual report: still free.", h: 160 }],
  [{ c: "#d7ecff", fg: "#0b3a63", t: "Make art. Not recurring payments.", h: 220, art: "flower" }, { c: "#fff", fg: "#222", t: "CanvaIsDead", s: "Creativity is doing great.", h: 200 }, { c: "#7c3aed", fg: "#fff", t: "SaaS? More like past tense.", h: 180 }, { c: "#fde2e2", fg: "#8a1c1c", t: "Invoice not found.", s: "404. Forever.", h: 170 }],
  [{ c: "#ffd6a8", fg: "#5e2b00", t: "Bury the bill.", s: "Keep the good ideas.", h: 210, art: "card" }, { c: "#0d4d3f", fg: "#fff", t: "Software with zero commitment issues.", h: 200 }, { c: "#fff", fg: "#111", t: "Ghosting SaaS since today.", h: 190, art: "ghost" }, { c: "#2b2b3a", fg: "#fff", t: "All the tools. None of the tolls.", h: 160 }],
  [{ c: "#e9f2d0", fg: "#2f4a0c", t: "Creativity: alive and well.", h: 180, art: "flower" }, { c: "#2a2a6e", fg: "#fff", t: "Dear SaaS, it's you. Not us.", h: 230 }, { c: "#ffe8f1", fg: "#7a1d4e", t: "Open source. Closed wallet.", h: 170 }, { c: "#d8f3f0", fg: "#0b4a45", t: "SaaS left the chat.", h: 190, art: "ghost" }],
];
function Sticker({ kind }: { kind: NonNullable<Tile["art"]> }) {
  return <svg className="cvl-sticker" viewBox="0 0 96 72" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {kind === "ghost" ? <><path d="M22 61V31a26 26 0 0152 0v30l-9-7-9 7-8-7-9 7-8-7z" fill="currentColor" fillOpacity=".12" /><circle cx="39" cy="30" r="2" /><circle cx="57" cy="30" r="2" /><path d="M41 42q7 6 14 0" /></> : kind === "card" ? <><rect x="12" y="15" width="72" height="44" rx="7" /><path d="M12 29h72M23 47h13M69 5L28 67" /></> : <><path d="M48 60V38M48 53Q25 34 25 55q15 13 23-2M48 56q23-22 23-2-13 13-23 2" /><circle cx="48" cy="26" r="10" /><path d="M42 16c-13-22-24 6-4 12-25 5-5 28 7 8 2 25 28 9 13-7 25 0 12-26-5-15 8-24-24-22-11 2" /></>}
  </svg>;
}
function Backdrop() {
  return <div className="cvl-bg" aria-hidden>{COLS.map((col, i) => <div key={i} className="cvl-col" style={{ marginTop: (i % 2 ? -150 : -40) - i * 8 }}>{col.concat(col).map((t, j) => <div key={j} className="cvl-tile" style={{ background: t.c, color: t.fg, height: t.h }}><b>{t.t}</b>{t.s && <span>{t.s}</span>}{t.art ? <Sticker kind={t.art} /> : <><i /><i /></>}</div>)}</div>)}<div className="cvl-dim" /></div>;
}
const Icon = ({ d, fill }: { d: string; fill?: string }) => <svg width="18" height="18" viewBox="0 0 24 24" fill={fill ?? "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>;

export function CvLogin({ config, demo, to }: { config: FirebaseClientConfig | null; demo: boolean; to: string }) {
  const [step, setStep] = useState<"choose" | "email">("choose");
  const [err, setErr] = useState(""); const [ck, setCk] = useState(false);
  useEffect(() => { setCk(!localStorage.getItem("canvaisdead:cookies")); }, []);
  const okCk = () => { localStorage.setItem("canvaisdead:cookies", "1"); setCk(false); };
  const google = async () => { setErr(""); try { await signInWithGoogle(config!, `${BP}/api/session`); window.location.assign(to); } catch (e) { setErr(authErrorMessage(e)); } };
  return <main className="cvl">
    <Backdrop />
    <header className="cvl-top"><Link href="/" className="cvl-logo"><Logo size={26} /></Link>
      <nav>{["Design", "Product", "Templates", "Business", "Education", "Help"].map(n => <Link key={n} href="/#features">{n}</Link>)}</nav></header>
    <section className="cvl-modal">
      {step === "choose" ? <>
        <h1>Log in or sign up in seconds</h1>
        <p className="cvl-sub">Use Google or your email to continue with CanvaIsDead (it&apos;s free)!</p>
        {!config && <p role="status" className="cvl-note">Sign-in not configured. Email and Google sign-in turn on once Firebase is set up.</p>}
        <div className="cvl-btns">
          <GoogleButton block disabled={!config} onClick={google} />
          <button type="button" onClick={() => setStep("email")}><Icon d="M3 6h18v12H3zM3 7l9 6 9-6" /><span>Continue with email</span></button>
        </div>
        <p className="cvl-legal">By continuing, you agree to this site&apos;s <a href="#">Terms of Use</a>. Read our <a href="#">Privacy Policy</a>.</p>
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
