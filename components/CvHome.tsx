import { FootCols } from "@/components/FootCols";
import Link from "next/link";
import "./cvhome.css";
import { BP } from "@/lib/basepath";

const GH = "https://github.com/tommy-muckstack/canvaisdead";
const Mark = ({ c = "#fff" }: { c?: string }) => <span className="cvh-logo" style={{ color: c }}><svg width="26" height="26" viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M6 16 L10 8 L14 14 L16 11 L18 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>CanvaIsDead</span>;
const NAV = ["Designs", "Product", "Templates", "Business", "Education", "Help"];
const FOOT: [string, string[]][] = [
  ["Product", ["Latest launches", "Visual Suite", "CanvaIsDead AI", "Brand management", "Social media", "Features", "Print", "Apps Marketplace", "Affinity"]],
  ["Get started", ["Create a design", "Templates", "Projects", "Everything included"]],
  ["About", ["About", "Newsroom", "Events", "Originals", "Careers", "Social impact", "Sustainability", "Case studies"]],
  ["Community", ["Communities", "Creators", "Affiliates", "Represents Fund", "Content partners", "Partner directory", "Developers"]],
  ["Inspiration", ["Design Trends", "Podcast", "Learn blog", "Templates Marketplace", "Font pairing", "Color wheel", "Colors", "Color palette generator"]],
  ["Help", ["Help Center", "Security", "Trust Center", "Safe AI", "Accessibility", "Enterprise services", "Design School", "Sitemap"]],
  ["Tools", ["QR code generator", "AI logo generator", "Signature generator", "Business name generator", "PDF converter", "PDF to JPG converter", "JPG to PDF converter", "Graph maker"]],
];
export function CvNav({ dark = false }: { dark?: boolean }) {
  return <header className={"cvh-nav" + (dark ? " dark" : "")}><Link href="/" aria-label="CanvaIsDead home"><Mark c={dark ? "#7d2ae8" : "#fff"} /></Link>
    <nav>{NAV.map(n => <a key={n} href="#">{n}</a>)}</nav><span className="sp" />
    <Link className="cvh-link" href="/login">Sign up</Link><Link className="cvh-pill" href="/login">Log in</Link></header>;
}
export function CvHome() {
  const tools: [string, string, string][] = [["Turn your image into an editable layout with Magic Layers", "linear-gradient(120deg,#8a38f5,#e83aa6 60%,#ff6b57)", "Explore Magic Layers"], ["Clean up photos with Magic Eraser", "linear-gradient(135deg,#ff4d6d,#ff9a3c)", "Explore Magic Eraser"], ["Remove image backgrounds in one click", "linear-gradient(135deg,#fbd9e3,#f9c8d4)", "Explore Background Remover"], ["Elevate your writing with Magic Write", "linear-gradient(135deg,#3b8fe8,#5ec3e8)", "Explore Magic Write"]];
  const tiles = ["#e9e6ff", "#ffd9c8", "#d8e9ff", "#ffe27a", "#c9f0d8", "#f8c8e6", "#ffd1a8", "#c9d8ff"];
  return <div className="cvh">
    <section className="cvh-hero"><CvNav />
      <h1>What will you design today?</h1>
      <p>Create social posts, presentations, posters, and more with CanvaIsDead. Everything is included, free.</p>
      <Link className="cvh-white" href="/login">Start designing</Link>
      <div className="cvh-mock"><div className="rail">{["Templates", "Elements", "Text", "Brand", "Uploads"].map(x => <i key={x}><b />{x}</i>)}</div>
        <div className="panel"><h6>Edit Image <u>✕</u></h6><small>Magic Studio</small><div className="g3"><b /><b /><b /></div><small>Filters</small><div className="g4"><b /><b /><b /><b /></div><small>Shadows</small><div className="g4"><b /><b /><b /><b /></div></div>
        <div className="canvas"><div className="photo"><span className="wing" /><span className="flower" /></div></div></div>
    </section>
    <section className="cvh-tools" id="features"><h2>Tools to power your best work</h2>
      <div className="cvh-tabs">{["AI", "Presentations", "Social", "Video", "Print Shop"].map((t, i) => <button key={t} className={i === 0 ? "on" : ""}><i />{t}</button>)}</div>
      <div className="cvh-grid"><div className="c big" style={{ background: tools[0][1] }}><h3>{tools[0][0]}</h3><Link href="/login">{tools[0][2]}</Link><span className="art a1" /></div>
        <div className="c" style={{ background: tools[1][1] }}><h3>{tools[1][0]}</h3><Link href="/login">{tools[1][2]}</Link><span className="art a2" /></div>
        <div className="c light" style={{ background: tools[2][1] }}><h3>{tools[2][0]}</h3><Link href="/login">{tools[2][2]}</Link><span className="art a3" /></div>
        <div className="c big2" style={{ background: tools[3][1] }}><h3>{tools[3][0]}</h3><Link href="/login">{tools[3][2]}</Link><span className="art a4" /></div></div>
      <span className="cvh-next">›</span></section>
    <section className="cvh-all"><h2>All the tools. All in one place.</h2>
      <div className="pair"><div className="c" style={{ background: "linear-gradient(160deg,#6a3cf5,#c04bf0)" }}><h3>Meet the Visual Suite</h3><p>Your entire workflow in one place for seamless creation and collaboration, powered by AI.</p><Link href="/login">Explore Visual Suite</Link><span className="orb" /></div>
        <div className="c" style={{ background: "linear-gradient(160deg,#ff9a6b,#f6a8c8)" }}><h3>Present with Impact</h3><p>Reimagine presentations with cinematic visuals, smart design, and AI-powered tools.</p><Link href="/login">Create a presentation</Link><span className="pitch" /></div></div></section>
    <section className="cvh-tpl"><h2>Templates for absolutely anything</h2>
      <div className="cvh-btns"><Link className="cvh-solid" href="/login">Start designing</Link><Link className="cvh-ghost" href="/login">Browse all templates</Link></div>
      <div className="strip">{tiles.map((c, i) => <span key={i} style={{ background: c, height: [330, 240, 300, 270, 330, 250, 310, 280][i], marginTop: i % 2 ? 36 : 0 }} />)}</div></section>
    <section className="cvh-eco"><h2>Unlock the creative ecosystem</h2>
      <div className="eco"><div className="c e1"><h3>Get inspired, build skills and discover what you can create</h3><Link href="/login">Explore Design Tour</Link></div>
        <div className="c e2"><h3>Create magic with featured designs</h3><Link href="/login">Explore the collection</Link></div>
        <div className="c e3"><h3>End-to-end platform for large organizations</h3><Link href="/login">Design together</Link></div>
        <div className="c e4"><h3>Built for small businesses with big aspirations</h3><Link href="/login">Start creating</Link></div></div></section>
    <section className="cvh-cta"><h2>Start designing with <em>CanvaIsDead</em></h2><Link className="cvh-white" href="/login">Get started</Link></section>
    <CvFooter />
  </div>;
}

export function CvFooter() {
  return <footer className="cvh-foot"><div className="cvh-fin">
      <div className="top"><Mark c="#7d2ae8" /><div><p>Download for free</p><span className="dl">Windows</span><span className="dl">Mac</span></div></div>
      <FootCols cols={FOOT} base={BP} />
      <div className="legal"><span>English (US)</span><p>CanvaIsDead is an independent open-source project, not affiliated with or endorsed by Canva Pty Ltd. Canva is a trademark of its owner. <a href={GH}>Source (Apache-2.0)</a></p><span>Privacy</span><span>Terms</span><span>© 2026</span></div></div></footer>;
}
