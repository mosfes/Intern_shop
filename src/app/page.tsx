import { Card, buttonVariants } from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { FeaturedTabs } from "@/components/home/featured-tabs";
import { FlashSale } from "@/components/home/flash-sale";
import { HeroSlider } from "@/components/home/hero";
import { ArrowRightIcon, HeadsetIcon, RefreshIcon, ShieldIcon, TruckIcon } from "@/components/icons";
import { BrandMark } from "@/components/ui/brand-mark";
import { Container, SectionHeader } from "@/components/ui/section";
import { getCatalog } from "@/lib/catalog-server";
import type { Promotion } from "@/lib/promotions";
import { getHomepagePromotions } from "@/lib/promotions-server";

const benefits = [
  { icon: TruckIcon, title: "ส่งฟรีทั่วประเทศ", text: "เมื่อสั่งซื้อครบ ฿3,000 ขึ้นไป" },
  { icon: ShieldIcon, title: "ของแท้ 100%", text: "" },
  { icon: RefreshIcon, title: "เปลี่ยนคืนใน 7 วัน", text: "หากสินค้ามีปัญหาจากการผลิต" },
  { icon: HeadsetIcon, title: "ปรึกษาผู้เชี่ยวชาญ", text: "ช่วยจัดสเปกฟรี ทุกวัน 10:00–21:00" },
];

export default async function HomePage() {
  const [{ categories, managedBrands, getProductsByTag }, promotions] = await Promise.all([getCatalog(), getHomepagePromotions()]);
  const homepageBrands = managedBrands.map((brand) => ({ brand }));
  return (
    <div className="space-y-16 pt-4 sm:space-y-20 sm:pt-6">
      {/* Hero + side promos — managed in the admin under โปรโมชัน */}
      {(promotions.HERO.length > 0 || promotions.SIDE.length > 0) && <Container className={promotions.HERO.length && promotions.SIDE.length ? "grid gap-4 lg:grid-cols-[1fr_320px]" : "grid gap-4"}>
        <HeroSlider slides={promotions.HERO} />
        {promotions.SIDE.length > 0 && <div className={`grid gap-4 sm:grid-cols-2 ${promotions.HERO.length ? "lg:grid-cols-1" : ""}`}>
          {promotions.SIDE.map((promo) => <SidePromo key={promo.id} promo={promo} />)}
        </div>}
      </Container>}

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
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-white">
                  <Image
                    src={c.image}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 20vw, 45vw"
                    className="object-contain p-3 transition-transform duration-500 ease-out motion-safe:group-hover:scale-105 motion-safe:group-focus-visible:scale-105"
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
      {!!homepageBrands.length && <Container>
        <SectionHeader title="แบรนด์ยอดนิยม" />
        <div className="marquee -mx-4 overflow-hidden sm:mx-0 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
          <div className="marquee-track flex w-max">
            <BrandLogoList brands={homepageBrands} />
            <BrandLogoList brands={homepageBrands} duplicate />
          </div>
        </div>
      </Container>}

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
      {promotions.BANNER.length > 0 && <Container className="grid gap-4 md:grid-cols-2">
        {promotions.BANNER.map((promo) => <PromoBanner key={promo.id} promo={promo} />)}
      </Container>}

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
function BrandLogoList({ brands, duplicate = false }: { brands: { brand: string }[]; duplicate?: boolean }) {
  return (
    <ul className={`flex shrink-0 gap-2 pb-2 pr-2 ${duplicate ? "marquee-dup" : ""}`} aria-hidden={duplicate || undefined}>
      {brands.map(({ brand }) => {
        return <li key={brand}>
          <Link
            href={`/products?brand=${encodeURIComponent(brand)}`}
            aria-label={brand}
            title={brand}
            tabIndex={duplicate ? -1 : undefined}
            className="flex h-12 items-center justify-center rounded-full border border-border bg-surface px-4 transition-colors hover:border-accent/40"
          >
            <BrandMark brand={brand} />
          </Link>
        </li>;
      })}
    </ul>
  );
}

function SidePromo({ promo: { ctaHref: href, tag: eyebrow, title, image, theme } }: { promo: Promotion }) {
  return (
    <Link
      href={href}
      className={`edm-promo-sidePromo ${theme === "dark" ? "edm-promo-sideGear" : "edm-promo-sideDeal"} group relative flex min-h-[250px] flex-col justify-between overflow-hidden rounded-xl p-6`}
    >
      <div className="edm-promo-sideBrand">
        <span>EDM<span className="edm-promo-brandDot">.</span> <small>PC Shop</small></span>
      </div>
      <Image
        src={image}
        alt=""
        fill
        sizes="(min-width: 1024px) 180px, (min-width: 640px) 25vw, 45vw"
        className={`edm-promo-sideProduct object-contain transition-transform duration-700 group-hover:scale-105`}
      />
      <div className="relative z-10 mt-8 max-w-[52%]">
        {eyebrow && <p className="edm-promo-sideLabel">{eyebrow}</p>}
        <p className="mt-1.5 text-lg font-semibold leading-snug">{title}</p>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium">
          ช้อปเลย <ArrowRightIcon size={16} className="transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}

function PromoBanner({ promo: { ctaHref: href, ctaLabel, tag: eyebrow, title, description: text, image } }: { promo: Promotion }) {
  return (
    <div className="group relative flex min-h-[240px] items-center overflow-hidden rounded-xl border border-border edm-promo-banner p-6 sm:p-8">
      <Image
        src={image}
        alt=""
        fill
        sizes="(min-width: 768px) 50vw, 100vw"
        className="edm-promo-bannerProduct object-contain transition-transform duration-700 motion-safe:group-hover:scale-105"
      />
      <div className="relative z-10 max-w-[58%]">
        {eyebrow && <p className="mb-2 text-sm font-medium text-accent">{eyebrow}</p>}
        <h3 className="text-xl font-semibold leading-snug sm:text-2xl">{title}</h3>
        {text && <p className="mt-2 text-sm text-muted">{text}</p>}
        <Link href={href} className={`${buttonVariants({ size: "sm" })} mt-5`}>
          {ctaLabel || "ดูสินค้า"} <ArrowRightIcon size={16} />
        </Link>
      </div>
    </div>
  );
}
