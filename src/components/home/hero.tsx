"use client";

import { Button, buttonVariants } from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import type { Promotion } from "@/lib/promotions";
import "./promotion-art.css";

export function HeroSlider({ slides }: { slides: Promotion[] }) {
  const [index, setIndex] = useState(0);
  const count = slides.length;
  const [paused, setPaused] = useState(false);
  // Hidden slides sit in the viewport (stacked, opacity 0), so lazy loading can't defer them. Render their
  // images only after the page has loaded, so they don't compete with the first slide (the LCP image).
  const [pageLoaded, setPageLoaded] = useState(false);

  useEffect(() => {
    const done = () => setPageLoaded(true);
    if (document.readyState === "complete") {
      const id = window.setTimeout(done, 0);
      return () => window.clearTimeout(id);
    }
    window.addEventListener("load", done, { once: true });
    return () => window.removeEventListener("load", done);
  }, []);

  useEffect(() => {
    if (paused || count < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), 6500);
    return () => window.clearInterval(id);
  }, [paused, count]);

  if (!count) return null;
  const current = index % count;
  const go = (d: number) => setIndex((i) => (i + d + count) % count);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="โปรโมชันแนะนำ"
      className="edm-promo-hero relative overflow-hidden rounded-xl border border-border"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="relative grid sm:min-h-[490px]">
        {slides.map((s, i) => (
          <div
            key={s.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} จาก ${count}`}
            aria-hidden={i !== current}
            inert={i !== current}
            className={`edm-promo-slide relative col-start-1 row-start-1 flex flex-col justify-center px-5 pb-12 pt-6 transition-opacity duration-700 sm:px-10 sm:pb-16 sm:pt-8 lg:px-12 ${
              i === current ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <div className="edm-promo-productStage">
              {(i === current || pageLoaded) && <Image
              src={s.image}
              alt=""
              fill
              loading={i === 0 ? "eager" : undefined}
              fetchPriority={i === 0 ? "high" : undefined}
              sizes="(min-width: 1024px) 900px, 100vw"
              className="object-contain p-0 sm:p-3"
              />}
            </div>
            <div className="edm-promo-campaign relative z-10 w-full sm:max-w-[56%]">
              {s.tag && <span className="edm-promo-campaignTag">{s.tag}</span>}
              <span className="edm-promo-fromShop">จาก <strong>EDM<span>.</span></strong> PC Shop</span>
            </div>
            <div className="relative z-10 w-[54%] sm:w-full sm:max-w-[56%]">
              {s.eyebrow && <p className="mb-1.5 text-[11px] font-medium tracking-wide edm-promo-eyebrow sm:mb-2 sm:text-sm">{s.eyebrow}</p>}
              <h1 className="edm-promo-productTitle">
                {s.title}
                {s.highlight && <span className="edm-promo-price">{s.highlight}</span>}
              </h1>
              <p className="mt-2 line-clamp-3 max-w-md text-xs leading-relaxed edm-promo-description sm:mt-3 sm:line-clamp-none sm:text-sm">{s.description}</p>
            </div>
            <div className="relative z-10 mt-5 flex w-full gap-2 sm:mt-6 sm:max-w-[56%] sm:flex-wrap sm:gap-3">
              <Link href={s.ctaHref} className={`${buttonVariants({ size: "lg" })} edm-promo-primaryCta`}>
                {s.ctaLabel || "ดูสินค้า"}
                <ArrowRightIcon size={18} />
              </Link>
              {s.secondaryHref && s.secondaryLabel && <Link
                href={s.secondaryHref}
                className={`${buttonVariants({ size: "lg", variant: "secondary" })} edm-promo-secondaryCta`}
              >
                {s.secondaryLabel}
              </Link>}
            </div>
          </div>
        ))}
      </div>

      {count > 1 && <>
      <div className="absolute bottom-5 left-6 z-20 flex items-center gap-2 sm:left-10 lg:left-14">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-label={`ไปสไลด์ที่ ${i + 1}`}
            aria-current={i === current}
            onClick={() => setIndex(i)}
            className={`edm-promo-dot h-1.5 rounded-full transition-all duration-300 ${i === current ? "w-8" : "w-3"}`}
          />
        ))}
      </div>
      <div className="absolute bottom-4 right-4 z-20 hidden gap-2 sm:flex">
        <Button isIconOnly size="sm" variant="secondary" aria-label="สไลด์ก่อนหน้า" onPress={() => go(-1)} className="rounded-full">
          <ChevronLeftIcon size={18} />
        </Button>
        <Button isIconOnly size="sm" variant="secondary" aria-label="สไลด์ถัดไป" onPress={() => go(1)} className="rounded-full">
          <ChevronRightIcon size={18} />
        </Button>
      </div>
      </>}
    </section>
  );
}
