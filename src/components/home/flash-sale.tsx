"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BoltIcon, ChevronDownIcon } from "@/components/icons";
import { ProductCard } from "@/components/product/product-card";
import { Container } from "@/components/ui/section";
import { flashSaleWindow, type FlashSaleSettings } from "@/lib/flash-sale";
import type { Product } from "@/lib/types";

function subscribeClock(cb: () => void) {
  const id = window.setInterval(cb, 1000);
  return () => window.clearInterval(id);
}
const getNowSecond = () => Math.floor(Date.now() / 1000);
const getServerNow = () => null;

function Countdown({ seconds }: { seconds: number | null }) {
  const parts = seconds === null ? null : [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60];
  const labels = ["ชม.", "นาที", "วินาที"];
  return <div className="flex items-center gap-1.5" role="timer" aria-live="off" aria-label="เวลาที่เหลือของ Flash Sale">
    {labels.map((label, i) => <div key={label} className="flex items-center gap-1.5">
      <span className="grid min-w-11 place-items-center rounded-xl bg-foreground px-2 py-1.5 text-center text-background">
        <span className="text-lg font-semibold tabular-nums leading-none">{parts ? String(parts[i]).padStart(2, "0") : "--"}</span>
        <span className="mt-0.5 text-[10px] leading-none opacity-70">{label}</span>
      </span>
      {i < 2 && <span className="font-semibold text-muted">:</span>}
    </div>)}
  </div>;
}

export function FlashSale({ products, settings }: { products: Product[]; settings: FlashSaleSettings }) {
  const now = useSyncExternalStore(subscribeClock, getNowSecond, getServerNow);
  const sale = now === null ? null : flashSaleWindow(settings, now * 1000);
  const visible = settings.enabled && products.length > 0 && (sale ? sale.active : !settings.startsAt);
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const updateEdges = useCallback(() => {
    const node = track.current;
    if (node) setEdges({ start: node.scrollLeft < 2, end: node.scrollLeft + node.clientWidth >= node.scrollWidth - 2 });
  }, []);
  useEffect(() => {
    const node = track.current;
    if (!node) return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(node); updateEdges();
    return () => observer.disconnect();
  }, [visible, products.length, updateEdges]);
  function slide(direction: number) {
    const node = track.current;
    if (node) node.scrollBy({ left: direction * node.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }
  if (!visible) return null;
  return <Container>
    <section aria-labelledby="flash-sale-title" className="rounded-xl border border-border bg-surface p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-lg bg-danger-soft text-danger"><BoltIcon size={22} /></span>
          <div><h2 id="flash-sale-title" className="text-2xl font-semibold tracking-tight">Flash Sale</h2><p className="text-sm text-muted">ดีลราคาพิเศษ จำนวนจำกัด{settings.endsAt ? ` · ถึง ${new Date(settings.endsAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} น.` : " หมดเขตเที่ยงคืนนี้"}</p></div>
        </div>
        <Countdown seconds={sale?.secondsLeft ?? null} />
      </div>
      <div className="mb-3 flex items-center justify-between gap-3"><p className="text-xs text-muted">เลื่อนเพื่อดูสินค้าทั้งหมด {products.length} รายการ</p><div className="flex gap-2">
        <button type="button" aria-label="สินค้าแฟลชเซลก่อนหน้า" aria-controls="flash-sale-products" disabled={edges.start} onClick={() => slide(-1)} className="rounded-full border border-border p-2 hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-30"><ChevronDownIcon size={18} className="rotate-90" /></button>
        <button type="button" aria-label="สินค้าแฟลชเซลถัดไป" aria-controls="flash-sale-products" disabled={edges.end} onClick={() => slide(1)} className="rounded-full border border-border p-2 hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-30"><ChevronDownIcon size={18} className="-rotate-90" /></button>
      </div></div>
      <div id="flash-sale-products" ref={track} onScroll={updateEdges} tabIndex={0} role="region" aria-label="สินค้าแฟลชเซล เลื่อนซ้ายขวาเพื่อดูเพิ่มเติม" className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pb-2 no-scrollbar focus-visible:outline-2 focus-visible:outline-accent sm:mx-0 sm:gap-5 sm:px-0">
        {products.map((product) => <div key={product.id} className="w-[72%] shrink-0 snap-start min-[420px]:w-[46%] sm:w-[calc((100%-40px)/3)] xl:w-[calc((100%-60px)/4)]"><ProductCard product={product} /></div>)}
      </div>
    </section>
  </Container>;
}
