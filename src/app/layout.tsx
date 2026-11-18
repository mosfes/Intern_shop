import type { Metadata, Viewport } from "next";
import { Kanit } from "next/font/google";
import { SiteChrome } from "@/components/layout/site-chrome";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Providers, themeInitScript } from "@/components/providers";
import { getCatalogMeta } from "@/lib/catalog-server";
import "./globals.css";

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["thai", "latin"],
  // 700/800 aren't used: bold text (<strong>, <th>) resolves to the 600 face, so they'd only add font downloads.
  weight: ["400", "500", "600"],
  display: "swap",
});

const siteUrl = process.env.AUTH_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
  || (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`)
  || process.env.EMAIL_SITE_URL
  || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "EDM PC Shop | ร้านอุปกรณ์คอมพิวเตอร์", template: "%s | EDM PC Shop" },
  description: "ช้อป CPU การ์ดจอ แรม SSD เมนบอร์ด จอมอนิเตอร์ และเกมมิ่งเกียร์ ของแท้ (เว็บไซต์สาธิต)",
  openGraph: {
    type: "website",
    siteName: "EDM PC Shop",
    title: "EDM PC Shop | ร้านอุปกรณ์คอมพิวเตอร์",
    description: "ช้อป CPU การ์ดจอ แรม SSD เมนบอร์ด จอมอนิเตอร์ และเกมมิ่งเกียร์ ของแท้ (เว็บไซต์สาธิต)",
    images: [{ url: "/brand/edm-brand-preview.png", width: 900, height: 600, alt: "EDM PC Shop" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "EDM PC Shop | ร้านอุปกรณ์คอมพิวเตอร์",
    description: "ช้อป CPU การ์ดจอ แรม SSD เมนบอร์ด จอมอนิเตอร์ และเกมมิ่งเกียร์ ของแท้ (เว็บไซต์สาธิต)",
    images: ["/brand/edm-brand-preview.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Only categories/brands/logos go to the browser here; product-heavy routes add <CatalogProducts>.
  const catalog = await getCatalogMeta();
  return (
    <html lang="th" data-scroll-behavior="smooth" suppressHydrationWarning className={`${kanit.variable} h-full`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Providers catalog={catalog}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-foreground"
          >
            ข้ามไปยังเนื้อหา
          </a>
          <SiteChrome header={<SiteHeader />} footer={<SiteFooter />}>
            {children}
          </SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
