import { Card, buttonVariants } from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { FeaturedTabs } from "@/components/home/featured-tabs";
import { FlashSale } from "@/components/home/flash-sale";
import { HeroSlider } from "@/components/home/hero";
import { ArrowRightIcon, HeadsetIcon, RefreshIcon, ShieldIcon, TruckIcon } from "@/components/icons";
import { Container, SectionHeader } from "@/components/ui/section";
import { scenePhotos } from "@/data/photos";
import { brandLogos } from "@/data/brand-logos";
import { getCatalog } from "@/lib/catalog-server";

const benefits = [
  { icon: TruckIcon, title: "ส่งฟรีทั่วประเทศ", text: "เมื่อสั่งซื้อครบ ฿3,000 ขึ้นไป" },
  { icon: ShieldIcon, title: "ของแท้ 100%", text: "" },
  { icon: RefreshIcon, title: "เปลี่ยนคืนใน 7 วัน", text: "หากสินค้ามีปัญหาจากการผลิต" },
  { icon: HeadsetIcon, title: "ปรึกษาผู้เชี่ยวชาญ", text: "ช่วยจัดสเปกฟรี ทุกวัน 10:00–21:00" },
];

export default async function HomePage() {
  const { categories, getProductsByTag } = await getCatalog();
  return (
    <div className="space-y-16 pt-4 sm:space-y-20 sm:pt-6">
      {/* Hero + side promos */}
      <Container className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <HeroSlider />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <SidePromo
            href="/products?category=ssd"
            eyebrow="โปรสัปดาห์นี้"
            title="SSD NVMe ลดสูงสุด 16%"
            image={scenePhotos.ssd}
          />
          <SidePromo
            href="/products?category=gaming-gear"
            eyebrow="เกมมิ่งเกียร์"
            title="เมาส์และคีย์บอร์ดเกมมิ่ง"
            image={scenePhotos.mouse}
          />
        </div>
      </Container>

      {/* Categories */}
      <Container>
        <SectionHeader title="เลือกซื้อตามหมวดหมู่" href="/products" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-5">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/products?category=${c.slug}`}
              className="group rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <Card className="h-full items-center gap-3 border border-border p-4 text-center transition-[border-color] duration-300 ease-out group-hover:border-accent/40 group-focus-visible:border-accent/40">
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-art">
                  <Image
                    src={c.image}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 20vw, 45vw"
                    className="bg-white object-contain p-3 transition-transform duration-500 ease-out motion-safe:group-hover:scale-105 motion-safe:group-focus-visible:scale-105"
                  />
                </div>
                <div>
                  <p className="font-medium">{c.nameTh}</p>
                  <p className="text-xs text-muted">{c.name}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </Container>

      {/* Brands — endless scrolling row (marquee); pauses on hover/focus, static + swipeable with reduced motion */}
      <Container>
        <SectionHeader title="แบรนด์ยอดนิยม" />
        <div className="marquee -mx-4 overflow-hidden sm:mx-0 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
          <div className="marquee-track flex w-max">
            <BrandLogoList />
            <BrandLogoList duplicate />
          </div>
        </div>
      </Container>

      {/* Flash sale */}
      <Container>
        <FlashSale products={getProductsByTag("flash-sale")} />
      </Container>

      {/* Featured */}
      <Container>
        <SectionHeader
          title="สินค้าแนะนำ"
          href="/products"
        />
        <FeaturedTabs />
      </Container>

      {/* Promo banners */}
      <Container className="grid gap-4 md:grid-cols-2">
        <PromoBanner
          href="/products?category=motherboard"
          title="จัดสเปกคอมครบชุด รับส่วนลดเพิ่ม 5%"
          text="เมื่อซื้อ CPU + เมนบอร์ด + แรม ในบิลเดียวกัน"
          image={scenePhotos.motherboard}
        />
        <PromoBanner
          href="/products?category=cooling"
          title="ชุดระบายความร้อน เริ่มต้น ฿3,890"
          text="ชุดน้ำ AIO 360mm และฮีตซิงก์ลมจาก Noctua, NZXT, ARCTIC"
          image={scenePhotos.cooling}
        />
      </Container>

      {/* Benefits */}
      <Container>
        <ul className="grid gap-4 rounded-xl border border-border bg-surface p-6 sm:grid-cols-2 lg:grid-cols-4 lg:p-8">
          {benefits.map((b) => (
            <li key={b.title} className="flex items-start gap-3">
              <b.icon size={24} className="mt-0.5 shrink-0 text-accent" />
              <div>
                <p className="font-medium">{b.title}</p>
                {b.text && <p className="text-sm text-muted">{b.text}</p>}
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </div>
  );
}

/** One full set of brand logos. The marquee renders it twice so the loop is seamless;
 * the duplicate is hidden from screen readers and keyboard focus. */
function BrandLogoList({ duplicate = false }: { duplicate?: boolean }) {
  return (
    <ul className={`flex shrink-0 gap-2 pb-2 pr-2 ${duplicate ? "marquee-dup" : ""}`} aria-hidden={duplicate || undefined}>
      {brandLogos.map((b) => (
        <li key={b.brand}>
          <Link
            href={`/products?brand=${encodeURIComponent(b.brand)}`}
            aria-label={b.brand}
            title={b.brand}
            tabIndex={duplicate ? -1 : undefined}
            className="flex h-12 items-center justify-center rounded-full border border-border bg-surface px-4 text-muted transition-colors hover:border-accent/40 hover:text-foreground"
          >
            {/* Mask the SVG so the logo takes the text colour and follows light/dark theme */}
            <span
              aria-hidden="true"
              className="block shrink-0 bg-current"
              style={{
                height: b.wordmark ? 18 : 26,
                width: Math.min((b.wordmark ? 18 : 26) * b.ratio, 88),
                maskImage: `url(${b.src})`,
                WebkitMaskImage: `url(${b.src})`,
                maskSize: "contain",
                WebkitMaskSize: "contain",
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
                maskPosition: "center",
                WebkitMaskPosition: "center",
              }}
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function SidePromo({ href, eyebrow, title, image }: { href: string; eyebrow: string; title: string; image: string }) {
  return (
    <Link
      href={href}
      className="group relative flex min-h-[200px] flex-col justify-end overflow-hidden rounded-xl border border-border bg-surface p-6 text-foreground transition-all"
    >
      <Image
        src={image}
        alt=""
        fill
        sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
        className="object-contain object-right p-5 pl-[54%] transition-transform duration-700 group-hover:scale-105"
      />
      <div className="relative z-10 max-w-[52%]">
        <p className="text-sm font-medium text-accent">{eyebrow}</p>
        <p className="mt-1.5 text-lg font-semibold leading-snug">{title}</p>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium">
          ช้อปเลย <ArrowRightIcon size={16} className="transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}

function PromoBanner({
  href,
  eyebrow,
  title,
  text,
  image,
}: {
  href: string;
  eyebrow?: string;
  title: string;
  text: string;
  image: string;
}) {
  return (
    <div className="group relative flex min-h-[240px] items-center overflow-hidden rounded-xl border border-border bg-white p-6 text-neutral-950 sm:p-8">
      <Image
        src={image}
        alt=""
        fill
        sizes="(min-width: 768px) 50vw, 100vw"
        className="object-contain object-right p-6 pl-[48%] transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-transparent" />
      <div className="relative z-10 max-w-[62%]">
        {eyebrow && <p className="mb-2 text-sm font-medium text-orange-700">{eyebrow}</p>}
        <h3 className="text-xl font-semibold leading-snug sm:text-2xl">{title}</h3>
        <p className="mt-2 text-sm text-neutral-600">{text}</p>
        <Link href={href} className={`${buttonVariants({ size: "sm" })} mt-5`}>
          ดูสินค้า <ArrowRightIcon size={16} />
        </Link>
      </div>
    </div>
  );
}
