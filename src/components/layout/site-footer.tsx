import Link from "next/link";
import { Logo, MailIcon, MapPinIcon, PhoneIcon } from "@/components/icons";
import { getCatalogData } from "@/lib/catalog-server";
import { NewsletterForm } from "./newsletter-form";

const helpLinks = [
  { href: "/orders", label: "ติดตามคำสั่งซื้อ" },
  { href: "/cart", label: "ตะกร้าสินค้า" },
  { href: "/wishlist", label: "รายการโปรด" },
  { href: "/profile", label: "บัญชีของฉัน" },
];

export async function SiteFooter() {
  const { categories } = await getCatalogData();
  return (
    <footer className="mt-20 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm text-muted">
            ร้านจำหน่ายอุปกรณ์คอมพิวเตอร์ระดับพรีเมียม คัดสรรสินค้าแท้ พร้อมทีมผู้เชี่ยวชาญให้คำปรึกษา
          </p>
          <ul className="space-y-2 text-sm text-muted">
            <li className="flex items-center gap-2">
              <MapPinIcon size={16} /> 991 ถนนพระราม 1 ปทุมวัน กรุงเทพฯ (ตัวอย่าง)
            </li>
            <li className="flex items-center gap-2">
              <PhoneIcon size={16} /> 02-000-0000
            </li>
            <li className="flex items-center gap-2">
              <MailIcon size={16} /> hello@edmpcshop.example
            </li>
          </ul>
        </div>
        <nav aria-label="หมวดหมู่">
          <h2 className="mb-4 text-sm font-semibold">หมวดหมู่สินค้า</h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-muted md:grid-cols-1">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/products?category=${c.slug}`} className="transition-colors hover:text-foreground">
                  {c.nameTh}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="ช่วยเหลือ">
          <h2 className="mb-4 text-sm font-semibold">บริการลูกค้า</h2>
          <ul className="space-y-2 text-sm text-muted">
            {helpLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="transition-colors hover:text-foreground">
                  {l.label}
                </Link>
              </li>
            ))}
            <li>นโยบายการคืนสินค้า</li>
            <li>การรับประกันสินค้า</li>
          </ul>
        </nav>
        <div>
          <h2 className="mb-2 text-sm font-semibold">รับข่าวสารและโปรโมชัน</h2>
          <p className="mb-4 text-sm text-muted">สมัครรับดีลพิเศษและสินค้าใหม่ก่อนใคร</p>
          <NewsletterForm />
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted sm:flex-row sm:px-6">
          <p>
            © 2026 EDM PC Shop — เว็บไซต์ตัวอย่างเพื่อการสาธิต ราคาและสินค้าเป็นข้อมูลสมมติ · ภาพประกอบจาก{" "}
            <a href="https://www.jib.co.th" target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
              JIB
            </a>{" "}และแหล่งภาพสินค้า
          </p>
          <p>ชำระเงินได้ด้วย บัตรเครดิต · พร้อมเพย์ · โอนผ่านธนาคาร</p>
        </div>
      </div>
    </footer>
  );
}
