"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, GridIcon } from "@/components/icons";
import { BrandMark } from "@/components/ui/brand-mark";

interface BrandOption {
  brand: string;
  count: number;
}

const tileCls = (active: boolean) =>
  [
    "group relative flex h-[76px] w-[112px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-xl border px-2 outline-none transition-all",
    "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-[124px]",
    active
      ? "border-accent bg-accent/10 text-accent shadow-[inset_0_0_0_1px_var(--accent)]"
      : "border-border bg-surface text-muted hover:-translate-y-0.5 hover:border-accent/50 hover:text-foreground",
  ].join(" ");

export function BrandPicker({
  title,
  options,
  selected,
  onChange,
}: {
  title: string;
  options: BrandOption[];
  selected: string[];
  onChange: (brands: string[]) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft > 4, end: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    measure();
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, options.length]);

  // On first render, bring the first selected brand into view (e.g. arriving from /products?brand=MSI).
  useEffect(() => {
    const el = scroller.current;
    const tile = el?.querySelector<HTMLElement>('[aria-pressed="true"][data-brand]');
    if (el && tile) el.scrollLeft = tile.offsetLeft - el.offsetLeft - 16;
  }, []);

  const scrollBy = (dir: 1 | -1) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const toggle = (brand: string) =>
    onChange(selected.includes(brand) ? selected.filter((b) => b !== brand) : [...selected, brand]);

  const total = options.reduce((n, o) => n + o.count, 0);
  const allActive = selected.length === 0;

  return (
    <section aria-label={title} className="mb-6 sm:mb-8">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
        </div>
        {(edges.start || edges.end) && (
          <div className="hidden gap-1.5 sm:flex">
            <button
              type="button"
              aria-label="เลื่อนไปทางซ้าย"
              disabled={!edges.start}
              onClick={() => scrollBy(-1)}
              className="grid size-8 place-items-center rounded-full border border-border bg-surface transition-colors hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-35"
            >
              <ChevronLeftIcon size={16} />
            </button>
            <button
              type="button"
              aria-label="เลื่อนไปทางขวา"
              disabled={!edges.end}
              onClick={() => scrollBy(1)}
              className="grid size-8 place-items-center rounded-full border border-border bg-surface transition-colors hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-35"
            >
              <ChevronRightIcon size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="relative -mx-4 sm:mx-0">
        <div
          ref={scroller}
          onScroll={measure}
          className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-px-4 px-4 py-1.5 no-scrollbar sm:scroll-px-0 sm:px-0"
        >
          <button type="button" aria-pressed={allActive} onClick={() => onChange([])} className={tileCls(allActive)}>
            <GridIcon size={22} />
            <span className="text-[11px] font-medium leading-none">
              ทั้งหมด <span className="opacity-70">({total})</span>
            </span>
          </button>

          {options.map(({ brand, count }) => {
            const active = selected.includes(brand);
            return (
              <button
                key={brand}
                data-brand={brand}
                type="button"
                aria-pressed={active}
                aria-label={`${brand} (${count} รายการ)`}
                title={brand}
                onClick={() => toggle(brand)}
                className={tileCls(active)}
              >
                {active && (
                  <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-accent text-accent-foreground">
                    <CheckIcon size={10} />
                  </span>
                )}
                <span className="flex h-7 w-full items-center justify-center">
                  <BrandMark brand={brand} />
                </span>
                <span className="text-[11px] leading-none text-muted group-aria-pressed:text-accent">{count} รายการ</span>
              </button>
            );
          })}
        </div>

        {/* Edge fades hint that the row scrolls */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent transition-opacity ${edges.start ? "opacity-100" : "opacity-0"}`}
        />
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent transition-opacity ${edges.end ? "opacity-100" : "opacity-0"}`}
        />
      </div>
    </section>
  );
}
