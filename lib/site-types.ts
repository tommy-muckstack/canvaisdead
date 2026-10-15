export type Cta = { label: string; href: string };
export type Site = {
  slug: string; name: string; theme: string;
  nav: { label: string; id: string }[]; // Marketing section anchors
  cta: string;
  hero: { variant: "search" | "split" | "center"; eyebrow: string; title: string[]; subtitle: string; primary: Cta; secondary?: Cta; shot: string; shotAlt: string; chips?: string[]; searchPlaceholder?: string };
  audience: string;
  stepsTitle: string; steps: { t: string; d: string }[];
  rows: { id: string; k: string; h: string; p: string; img: string; alt: string; cta: string }[];
  statsTitle: string; stats: { b: string; s: string }[];
  integrations: { title: string; text: string };
  features: { name: string }[];
  finalCta: { title: string; sub: string };
  footer: { title: string; links: { label: string; href: string }[] }[];
  trademark: string;
  repo: string;
};
