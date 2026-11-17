import { buttonVariants } from "@heroui/react";
import type { Metadata } from "next";
import Link from "next/link";
import "./not-found.css";

export const metadata: Metadata = {
  title: "ไม่พบหน้าที่ต้องการ",
};

const BLADES = Array.from({ length: 7 }, (_, i) => (360 / 7) * i);

function Spark({ x, y, size, color }: { x: number; y: number; size: number; color: string }) {
  return (
    <path
      className="nf-spark"
      d={`M${x} ${y - size}L${x + size * 0.28} ${y - size * 0.28}L${x + size} ${y}L${x + size * 0.28} ${y + size * 0.28}L${x} ${y + size}L${x - size * 0.28} ${y + size * 0.28}L${x - size} ${y}L${x - size * 0.28} ${y - size * 0.28}Z`}
      fill={color}
    />
  );
}

function FourOhFour() {
  return (
    <svg
      className="nf-art"
      viewBox="0 0 520 220"
      role="img"
      aria-label="404 โดยเลข 0 เป็นพัดลมเคสคอมพิวเตอร์ไฟ RGB หน้าตายิ้มแย้ม"
    >
      <defs>
        <linearGradient id="nf-rgb" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f97316" />
          <stop offset="0.35" stopColor="#ec4899" />
          <stop offset="0.7" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>

      <ellipse className="nf-shadow" cx="260" cy="206" rx="110" ry="5" fill="var(--foreground)" opacity="0.1" />

      <g className="nf-float">
        {/* the two 4s */}
        <g fill="none" stroke="var(--foreground)" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round">
          <path d="M92 34 40 126h82M92 34v140" transform="translate(0 -4)" />
          <path d="M92 34 40 126h82M92 34v140" transform="translate(358 -4)" />
        </g>

        {/* the 0: an RGB case fan with a face */}
        <g transform="translate(260 96)">
          <circle r="70" fill="var(--nf-disc)" />
          <circle className="nf-ring" r="70" fill="none" stroke="url(#nf-rgb)" strokeWidth="7" />
          <circle r="60" fill="none" stroke="var(--nf-edge)" strokeWidth="1.5" />

          <g className="nf-fan">
            <circle r="60" fill="none" />
            {BLADES.map((deg) => (
              <path
                key={deg}
                transform={`rotate(${deg})`}
                d="M-3 -24C-22 -34 -24 -52 -8 -60C8 -58 14 -44 6 -30C3 -26 0 -24 -3 -24Z"
                fill="var(--nf-blade)"
                stroke="var(--nf-edge)"
                strokeWidth="1"
              />
            ))}
          </g>

          {/* hub + face */}
          <circle r="31" fill="var(--nf-face)" stroke="var(--nf-edge)" strokeWidth="2" />
          <g className="nf-eyes">
            <circle cx="-11" cy="-4" r="4.6" fill="var(--nf-ink)" />
            <circle cx="11" cy="-4" r="4.6" fill="var(--nf-ink)" />
            <circle cx="-9.4" cy="-5.6" r="1.5" fill="#fff" />
            <circle cx="12.6" cy="-5.6" r="1.5" fill="#fff" />
          </g>
          <circle cx="-19" cy="6" r="4" fill="#f472b6" opacity="0.35" />
          <circle cx="19" cy="6" r="4" fill="#f472b6" opacity="0.35" />
          <path d="M-5 6Q0 12 5 6" fill="none" stroke="var(--nf-ink)" strokeWidth="2.2" strokeLinecap="round" />
        </g>

        {/* sparkles */}
        <Spark x={150} y={34} size={9} color="#ec4899" />
        <Spark x={374} y={24} size={7} color="var(--accent)" />
        <Spark x={330} y={186} size={6} color="#8b5cf6" />
      </g>
    </svg>
  );
}

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-12 text-center sm:py-20">
      <FourOhFour />

      <h1 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">ไม่พบหน้าที่คุณต้องการ</h1>
      <p className="mt-2 text-muted">หน้านี้อาจถูกย้ายหรือถูกลบไปแล้ว</p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className={buttonVariants()}>
          กลับหน้าแรก
        </Link>
        <Link href="/products" className={buttonVariants({ variant: "secondary" })}>
          ดูสินค้าทั้งหมด
        </Link>
      </div>
    </div>
  );
}
