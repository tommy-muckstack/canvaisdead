import Link from "next/link";
import { CvNav, CvFooter } from "@/components/CvHome";
import "@/components/cvhome.css";
export const metadata = { title: "Plans and pricing | CanvaIsDead" };
const plans: [string, string, string, string, string[], boolean][] = [
  ["Free", "Individuals", "Design simple things and bring your ideas to life. No cost, just creativity.", "US$0", ["Easy drag-and-drop editor", "Original templates to start fast", "Clean exports, never a watermark", "Everything saved in your browser"], false],
  ["Pro", "Individuals", "Unlock premium content, more powerful design tools, and AI features.", "US$144", ["Everything in Free", "More AI uses per month", "Brand kit and resize tools", "Social content scheduling"], false],
  ["Business", "Individuals and teams", "Create content faster, market smarter, and grow your business with advanced tools.", "US$250", ["Everything in Pro", "Team brand controls", "Approval workflows", "Priority support"], true],
  ["Enterprise", "Organizations", "Empower your organization with end-to-end visual communication.", "Let's talk", ["SSO and provisioning", "Custom brand kits", "Advanced admin controls", "Dedicated success manager"], false],
];
const FAQ = ["Is CanvaIsDead really free?", "How does it compare to Canva Pro?", "Where are my designs stored?", "Can I export without a watermark?", "What file types can I export?", "Does it work offline?", "Can I use it with my team?", "Can I bring my own fonts?", "Is there a mobile app?", "How do I contribute?", "Which license is it under?", "Is my data private?", "Can I self-host it?", "Does it include stock photos?", "What is on the roadmap?"];
export default function Pricing() {
  return <div className="cvh cvp">
    <CvNav dark />
    <div className="cvp-banner">✦ Fast-track your creative vision with AI Pass, available as an add-on to any plan. <b>Learn more</b></div>
    <h1>Plans and pricing</h1>
    <div className="cvp-tabs"><span className="on">Individuals and business</span><span>Education</span></div>
    <div className="cvp-bill"><span>Monthly</span><i /><span>Yearly</span><u>Save from 16%</u></div>
    <div className="cvp-plans">{plans.map(([n, who, d, p, f, rec]) => <section key={n} className={rec ? "rec" : ""}>{rec && <em>Recommended</em>}<small>{who}</small><h2>{n}</h2><p>{d}</p><div className="pr">{p}</div><Link href="/login" className="cvp-btn">{n === "Enterprise" ? "Contact sales" : "Get started"}</Link><h4>With {n}, you get:</h4><ul>{f.map(x => <li key={x}>{x}</li>)}</ul></section>)}</div>
    <p className="cvp-note">Prices exclude applicable tax. CanvaIsDead is free: the tiers above mirror Canva's price list for comparison only.</p>
    <section className="cvp-cmp" id="pricing"><h2>Compare features</h2><div className="tbl">{["Designs and exports", "Transparent downloads", "Resize to any preset", "PNG, JPG and SVG export", "Smart guides and layers", "Brand colors"].map(r => <div key={r}><b>{r}</b><span>Free</span><span>Pro</span><span>Business</span><span>Enterprise</span></div>)}</div></section>
    <section className="cvp-promo"><div style={{ background: "linear-gradient(135deg,#6a3df0,#c04bf0)" }}><h3>Power growth with CanvaIsDead Business</h3><Link href="/login">Explore Business</Link></div><div style={{ background: "linear-gradient(135deg,#4f7de8,#a87cf0)" }}><h3>Start your design with a teacher-ready AI pack</h3><Link href="/login">Try it free</Link></div></section>
    <section className="cvp-faq"><h2>Frequently Asked Questions</h2>{FAQ.map(q => <details key={q}><summary>{q}</summary><p>CanvaIsDead is an independent open-source project. See the README on GitHub for details.</p></details>)}</section>
    <CvFooter />
  </div>;
}
