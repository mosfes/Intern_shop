"use client";

import { Button, buttonVariants } from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { scenePhotos } from "@/data/photos";

const slides = [
  {
    tag: "มาใหม่",
    eyebrow: "GeForce RTX 50 Series",
    title: "RTX 5070 มาแล้ว\nเริ่มต้น ฿22,900",
    description: "ASUS TUF Gaming RTX 5070 12GB รองรับ DLSS 4 เล่นเกม 1440p ได้สบาย ๆ",
    cta: { href: "/products?category=gpu", label: "ช้อปการ์ดจอ" },
    secondary: { href: "/products/asus-tuf-geforce-rtx-5070", label: "ดู RTX 5070" },
    image: scenePhotos.heroGpu,
  },
  {
    tag: "ขายดี",
    eyebrow: "AMD Ryzen 9000X3D",
    title: "Ryzen 7 9800X3D\nเหลือ ฿17,990",
    description: "ลดจาก ฿19,500 ถึงสิ้นสัปดาห์นี้ ซีพียูสายเล่นเกมที่ได้เฟรมเรตสูงสุดตอนนี้ ด้วย 3D V-Cache",
    cta: { href: "/products/amd-ryzen-7-9800x3d", label: "ซื้อเลย" },
    secondary: { href: "/products?category=cpu", label: "ซีพียูทั้งหมด" },
    image: scenePhotos.heroCpu,
  },
  {
    tag: "สายครีเอเตอร์",
    eyebrow: "จอ OLED 240Hz",
    title: "จอ OLED 27 นิ้ว 240Hz\nราคา ฿26,900",
    description: "LG UltraGear OLED สีดำสนิท ตอบสนอง 0.03ms ใช้ได้ทั้งเล่นเกมและแต่งภาพ",
    cta: { href: "/products?category=monitor", label: "ช้อปจอมอนิเตอร์" },
    secondary: { href: "/products/lg-ultragear-27-oled-240hz", label: "LG UltraGear OLED" },
    image: scenePhotos.heroMonitor,
  },
];

export function HeroSlider() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), 6500);
    return () => window.clearInterval(id);
  }, [paused]);

  const go = (d: number) => setIndex((i) => (i + d + slides.length) % slides.length);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="โปรโมชันแนะนำ"
      className="relative overflow-hidden rounded-xl border border-border bg-surface"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="relative min-h-[620px] sm:min-h-[460px]">
        {slides.map((s, i) => (
          <div
            key={s.title}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} จาก ${slides.length}`}
            aria-hidden={i !== index}
            inert={i !== index}
            className={`absolute inset-0 flex items-end bg-surface px-6 pb-16 pt-8 text-foreground transition-opacity duration-700 sm:items-center sm:px-10 sm:pb-8 lg:px-14 ${
              i === index ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <div className="absolute inset-x-5 top-5 h-[240px] sm:inset-y-6 sm:left-auto sm:right-6 sm:h-auto sm:w-[43%]">
              <Image
              src={s.image}
              alt=""
              fill
              loading={i === 0 ? "eager" : undefined}
              fetchPriority={i === 0 ? "high" : undefined}
              sizes="(min-width: 1024px) 900px, 100vw"
              className={`object-contain p-6 transition-transform duration-[6000ms] ease-out ${i === index ? "scale-105" : "scale-100"}`}
              />
            </div>
            <div className="relative z-10 max-w-lg sm:max-w-[51%]">
              <p className="mb-4 flex items-center gap-2.5 text-sm text-muted">
                <span className="rounded-md bg-accent/10 px-2 py-0.5 text-[13px] font-medium text-accent">{s.tag}</span>
                {s.eyebrow}
              </p>
              <h1 className="whitespace-pre-line text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-[2.6rem]">
                {s.title}
              </h1>
              <p className="mt-4 text-sm text-muted sm:text-base">{s.description}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={s.cta.href} className={buttonVariants({ size: "lg" })}>
                  {s.cta.label}
                  <ArrowRightIcon size={18} />
                </Link>
                <Link
                  href={s.secondary.href}
                  className={buttonVariants({ size: "lg", variant: "secondary" })}
                >
                  {s.secondary.label}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-5 left-6 z-20 flex items-center gap-2 sm:left-10 lg:left-14">
        {slides.map((s, i) => (
          <button
            key={s.title}
            type="button"
            aria-label={`ไปสไลด์ที่ ${i + 1}`}
            aria-current={i === index}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? "w-8 bg-foreground" : "w-3 bg-foreground/25 hover:bg-foreground/50"}`}
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
    </section>
  );
}
