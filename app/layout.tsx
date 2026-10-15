import "@/vendor/isdead-design/css/canva.css";
import "@/vendor/isdead-design/css/components.css";
import "./globals.css";
import { site } from "@/site.config";
import { WebsiteAnalytics } from "@/components/WebsiteAnalytics";
export const metadata = { title: `${site.name}: free, open-source design editor`, description: site.hero.subtitle };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" data-ids-theme="canva"><body className="ids-root">{children}<WebsiteAnalytics /></body></html>;
}
