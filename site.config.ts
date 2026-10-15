import type { Site } from "@/lib/site-types";
const GH = "https://github.com/tommy-muckstack/canvaisdead";
export const site: Site = {
  slug: "canvaisdead", name: "CanvaIsDead", theme: "canva",
  nav: [{ label: "Design", id: "design" }, { label: "Templates", id: "solutions" }, { label: "Learn", id: "resources" }, { label: "Features", id: "features" }],
  cta: "Start designing",
  hero: { variant: "search", eyebrow: "Free · Open source · No watermark, ever", title: ["What will you", "design today?"], subtitle: "Drag-and-drop design for posts, slides, posters and thumbnails. Every template, shape and export is included.",
    primary: { label: "Start designing", href: "/login" }, secondary: { label: "See features", href: "/#features" }, shot: "editor.png", shotAlt: "The CanvaIsDead editor with a pitch-deck slide open, shape and text tools on the left and a formatting bar on top",
    searchPlaceholder: "Search templates, e.g. “Instagram post”", chips: ["Instagram post", "Presentation", "Poster", "YouTube thumbnail", "Business card", "Logo"] },
  audience: "Made for founders, teachers, creators, small shops, clubs and anyone who needs something to look good by 5 PM",
  stepsTitle: "From blank page to finished design in four moves",
  steps: [{ t: "Pick a size", d: "Social posts, stories, slides, posters, cards and logos, with exact pixel sizes, or resize later." }, { t: "Start from a template", d: "Eight original starters to remix, or begin with a blank page and a color." }, { t: "Make it yours", d: "Drag, resize, rotate and snap to guides. Edit text, fonts, colors, opacity and layers." }, { t: "Download", d: "Export PNG, JPG or SVG at full size. No watermark and no export limits." }],
  rows: [
    { id: "design", k: "Editor", h: "A real drag-and-drop editor, in your browser", p: "Smart guides snap to the page and to other elements. Shift-drag keeps proportions, arrow keys nudge, and ⌘Z undoes anything. Your work saves as you go.", img: "editor.png", alt: "The editor with a selected circle and the formatting toolbar", cta: "Open the editor" },
    { id: "templates", k: "Templates", h: "Start from something that already looks good", p: "Quotes, sales, title slides, thumbnails, posters, cards and logos. One click applies a template, and every part of it is editable.", img: "templates.png", alt: "The templates panel showing eight starter designs", cta: "Browse templates" },
    { id: "text", k: "Text & type", h: "Headings, subheadings and body, done in seconds", p: "Click to type, double-click to edit in place, and pick a font, size, weight, alignment and color from the toolbar above the page.", img: "text.png", alt: "A text element selected with font, size and alignment controls", cta: "Try the text tools" },
    { id: "home", k: "Your designs", h: "Everything you've made, in one place", p: "Search, reopen and duplicate designs from your home screen. Everything stays in your browser until you export it.", img: "dashboard.png", alt: "The home screen with a search bar, size shortcuts and recent designs", cta: "See your home" },
  ],
  statsTitle: "Real numbers, no fine print",
  stats: [{ b: "$0", s: "per person, per month, forever" }, { b: "0 watermarks", s: "every export is clean, every size" }, { b: "8 sizes", s: "social, slides, print and logo presets" }, { b: "Apache-2.0", s: "fork it, change it, ship it" }],
  integrations: { title: "Exports that work everywhere", text: "PNG and JPG for the web and social, SVG for print shops and developers. Drop a design into any email, deck or site." },
  features: [{ name: "Designs and exports" }, { name: "Transparent, watermark-free downloads" }, { name: "Resize a design to any preset" }, { name: "PNG, JPG and SVG export" }, { name: "Page color and custom colors" }, { name: "Smart-guide snapping and layers" }],
  finalCta: { title: "Make something. Skip the subscription.", sub: "Open the editor and your first design is two clicks away." },
  footer: [
    { title: "Product", links: [{ label: "Editor", href: "/#design" }, { label: "Templates", href: "/#templates" }, { label: "Text tools", href: "/#text" }, { label: "Features", href: "/#features" }] },
    { title: "Get started", links: [{ label: "Log in", href: "/login" }, { label: "Try the demo account", href: "/login" }, { label: "Everything included", href: "/#features" }] },
    { title: "Open source", links: [{ label: "GitHub", href: GH }, { label: "Apache-2.0 license", href: GH + "/blob/main/LICENSE" }] },
    { title: "More IsDead apps", links: [{ label: "CalendlyIsDead", href: "/calendlyisdead" }, { label: "TypeformIsDead", href: "/typeformisdead" }, { label: "DocuSignIsDead", href: "/docusignisdead" }, { label: "GrammarlyIsDead", href: "/grammarlyisdead" }] },
  ],
  trademark: "CanvaIsDead is an independent open-source project, not affiliated with or endorsed by any other design platform. All third-party trademarks belong to their respective owners.",
  repo: GH,
};
