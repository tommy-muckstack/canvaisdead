import "@/vendor/isdead-design/css/canva.css";
import "@/vendor/isdead-design/css/components.css";
import "./globals.css";
import { site } from "@/site.config";
import { WebsiteAnalytics } from "@/components/WebsiteAnalytics";
import { Analytics } from "@/lib/analytics/posthog";
import { BP } from "@/lib/basepath";
export const metadata = {
  title: `${site.name}: free, open-source design editor`, description: site.hero.subtitle,
  applicationName: site.name,
  icons: {
    icon: [
      { url: `${BP}/brand/favicon.ico`, sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: `${BP}/brand/favicon-16.png`, sizes: "16x16", type: "image/png" },
      { url: `${BP}/brand/favicon-32.png`, sizes: "32x32", type: "image/png" },
      { url: `${BP}/brand/favicon-48.png`, sizes: "48x48", type: "image/png" },
    ],
    apple: [{ url: `${BP}/brand/apple-touch-icon.png`, sizes: "180x180", type: "image/png" }],
  },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" data-ids-theme="canva"><body className="ids-root">{children}<WebsiteAnalytics /><Analytics /></body></html>;
}
