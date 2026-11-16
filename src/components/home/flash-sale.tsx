"use client";

import { useSyncExternalStore } from "react";
import { BoltIcon } from "@/components/icons";
import { ProductCard } from "@/components/product/product-card";
import type { Product } from "@/lib/types";

/** Counts down to the next midnight (local time). Client-only to avoid hydration mismatch. */
function subscribeClock(cb: () => void) {
  const id = window.setInterval(cb, 1000);
  return () => window.clearInterval(id);
}
const getNowSecond = () => Math.floor(Date.now() / 1000);
const getServerNow = () => null;

function useCountdown() {
  const now = useSyncExternalStore(subscribeClock, getNowSecond, getServerNow);
  if (now === null) return null;
  const end = new Date(now * 1000);
  end.setHours(24, 0, 0, 0);
  const left = Math.max(0, Math.floor(end.getTime() / 1000) - now);
  return [Math.floor(left / 3600), Math.floor((left % 3600) / 60), left % 60];
}

function Countdown() {
  const parts = useCountdown();
  const labels = ["ชม.", "นาที", "วินาที"];
  return (
    <div className="flex items-center gap-1.5" role="timer" aria-live="off" aria-label="เวลาที่เหลือของ Flash Sale">
      {labels.map((l, i) => (
        <div key={l} className="flex items-center gap-1.5">
          <span className="grid min-w-11 place-items-center rounded-xl bg-foreground px-2 py-1.5 text-center text-background">
            <span className="text-lg font-semibold tabular-nums leading-none">
              {parts ? String(parts[i]).padStart(2, "0") : "--"}
            </span>
            <span className="mt-0.5 text-[10px] leading-none opacity-70">{l}</span>
          </span>
          {i < 2 && <span className="font-semibold text-muted">:</span>}
        </div>
      ))}
    </div>
  );
}

export function FlashSale({ products }: { products: Product[] }) {
  return (
    <section aria-labelledby="flash-sale-title" className="rounded-xl border border-border bg-surface p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-lg bg-danger-soft text-danger">
            <BoltIcon size={22} />
          </span>
          <div>
            <h2 id="flash-sale-title" className="text-2xl font-semibold tracking-tight">
              Flash Sale วันนี้
            </h2>
            <p className="text-sm text-muted">ดีลราคาพิเศษ จำนวนจำกัด หมดเขตเที่ยงคืนนี้</p>
          </div>
        </div>
        <Countdown />
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 no-scrollbar sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-5 sm:overflow-visible sm:px-0 xl:grid-cols-4">
        {products.slice(0, 4).map((p) => (
          <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-auto">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
