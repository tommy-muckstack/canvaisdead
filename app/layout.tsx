import "@/vendor/isdead-design/css/canva.css";
import "@/vendor/isdead-design/css/components.css";
import "./globals.css";
import { site } from "@/site.config";
export const metadata = { title: `${site.name}: free, open-source ${site.replaces} alternative`, description: site.hero.subtitle };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" data-ids-theme="canva"><body className="ids-root">{children}</body></html>;
}
