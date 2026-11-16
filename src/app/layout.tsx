import type { Metadata, Viewport } from "next";
import { Kanit } from "next/font/google";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Providers, themeInitScript } from "@/components/providers";
import { getCatalogData } from "@/lib/catalog-server";
import "./globals.css";

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "EDM PC Shop | ร้านอุปกรณ์คอมพิวเตอร์", template: "%s | EDM PC Shop" },
  description: "ช้อป CPU การ์ดจอ แรม SSD เมนบอร์ด จอมอนิเตอร์ และเกมมิ่งเกียร์ ของแท้ (เว็บไซต์สาธิต)",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const catalog = await getCatalogData();
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
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
