"use client";

import { Button, Label, ListBox, Select, Separator, buttonVariants } from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { useCatalog } from "@/components/catalog-provider";
import { CartIcon, ChevronRightIcon, CloseIcon, SearchIcon } from "@/components/icons";
import { buildSlots, checkBuild, powerSupplyAdvice, type BuildParts, type BuildSlot } from "@/lib/pc-builder";
import { formatBaht } from "@/lib/format";
import { ADMIN_ORDER_BLOCKED_MESSAGE, storeActions, useHydrated, useIsAdmin, useStore } from "@/lib/store";

const fieldClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20";
const sortOptions = [
  { id: "price-asc", label: "ราคา: ต่ำไปสูง" },
  { id: "price-desc", label: "ราคา: สูงไปต่ำ" },
  { id: "name", label: "ชื่อสินค้า" },
];

export function PcBuilder() {
  const { products, productMap } = useCatalog();
  const build = useStore((s) => s.pcBuild);
  const hydrated = useHydrated();
  const isAdmin = useIsAdmin();
  const pickerRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState<BuildSlot>("cpu");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("price-asc");
  const [budget, setBudget] = useState("50000");
  const [message, setMessage] = useState("");
  const [added, setAdded] = useState(false);
  const parts: BuildParts = {};
  for (const slot of buildSlots) {
    const product = productMap.get(build[slot.key] ?? "");
    if (product?.category === slot.key) parts[slot.key] = product;
  }
  const selected = Object.values(parts);
  const missing = buildSlots.filter((slot) => !parts[slot.key]);
  const stale = buildSlots.some((slot) => build[slot.key] && !parts[slot.key]);
  const total = selected.reduce((sum, product) => sum + product.price, 0);
  const errors = checkBuild(parts).filter((c) => c.status === "error");
  const powerAdvice = powerSupplyAdvice(parts);
  const soldOut = selected.some((p) => p.stock <= 0);
  const budgetValue = Number(budget);
  const hasBudget = Number.isFinite(budgetValue) && budgetValue > 0;
  const overBudget = hasBudget && total > budgetValue;
  const canCheckout = hydrated && !missing.length && !errors.length && !soldOut;
  const activeSlot = buildSlots.find((s) => s.key === active)!;
  const slotErrors = (slot: BuildSlot, product: BuildParts[BuildSlot]) => {
    const without = new Set(checkBuild({ ...parts, [slot]: undefined }).filter((c) => c.status === "error").map((c) => c.label));
    return checkBuild({ ...parts, [slot]: product }).filter((c) => c.status === "error" && !without.has(c.label));
  };
  // Progressive filtering: each slot only lists products that fit the parts already chosen.
  const inSlot = products.filter((p) => p.category === active);
  const compatible = inSlot.filter((p) => !slotErrors(active, p).length);
  const candidates = compatible.filter((p) => `${p.name} ${p.brand} ${p.shortSpecs.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => sort === "price-desc" ? b.price - a.price : sort === "name" ? a.name.localeCompare(b.name) : a.price - b.price);

  function open(key: BuildSlot, scroll = false) {
    setActive(key);
    setQuery("");
    if (scroll && window.matchMedia("(max-width: 1023px)").matches) requestAnimationFrame(() => pickerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function choose(id: string) {
    storeActions.savePcBuild({ ...build, [active]: id });
    setMessage("");
    setAdded(false);
    const next = buildSlots.find((s) => s.key !== active && !parts[s.key]);
    if (next) open(next.key);
  }

  function remove(key: BuildSlot) {
    const next = { ...build };
    delete next[key];
    storeActions.savePcBuild(next);
    setAdded(false);
  }

  function reset() {
    storeActions.savePcBuild({});
    setAdded(false);
    setMessage("");
    open("cpu");
  }

  function addToCart() {
    if (!canCheckout) return;
    if (isAdmin) {
      setAdded(false);
      setMessage(ADMIN_ORDER_BLOCKED_MESSAGE);
      return;
    }
    const ok = storeActions.addBuildToCart(selected);
    setAdded(ok);
    setMessage(ok ?"เพิ่มอุปกรณ์ทั้งชุดลงตะกร้าแล้ว" : "เพิ่มไม่ได้: สินค้าบางชิ้นในตะกร้ารวมกับชุดนี้เกินสต็อก กรุณาตรวจสอบตะกร้า");
  }

  return (
    <div className="grid items-start gap-6 pb-20 lg:grid-cols-[360px_minmax(0,1fr)] lg:pb-0">
      {/* ── Left: build list + price ── */}
      <aside className="space-y-4 lg:sticky lg:top-36 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto lg:[scrollbar-width:thin]" aria-label="สเปคของคุณ">
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-semibold">สเปคของคุณ <span className="text-sm font-normal text-muted">({selected.length}/{buildSlots.length})</span></h2>
            <button type="button" disabled={!hydrated || !Object.keys(build).length} onClick={reset} className="text-sm text-muted hover:text-danger disabled:pointer-events-none disabled:opacity-40">ล้างทั้งหมด</button>
          </div>
          {stale && <p className="border-b border-border px-4 py-2 text-xs text-danger">สินค้าบางชิ้นที่บันทึกไว้ไม่มีในแคตตาล็อกแล้ว กรุณาเลือกใหม่</p>}
          <ul>
            {buildSlots.map((slot) => {
              const product = parts[slot.key];
              const isActive = active === slot.key;
              return (
                <li key={slot.key} className={`relative flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0 ${isActive ? "bg-accent/10" : "hover:bg-surface-secondary"}`}>
                  {isActive && <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-accent" />}
                  <button type="button" onClick={() => open(slot.key, true)} aria-current={isActive ? "true" : undefined} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className={`relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md border ${product ? "border-border bg-white" : "border-dashed border-border text-xs text-muted"}`}>
                      {product ? <Image src={product.images[0]} alt="" fill sizes="56px" className="object-contain p-1" /> : "+"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-xs ${isActive ? "text-accent" : "text-muted"}`}>{slot.name}</span>
                      {product ? (
                        <>
                          <span className="block truncate text-sm">{product.name}</span>
                          <span className="block text-sm font-medium tabular-nums">{formatBaht(product.price)}{product.stock <= 0 && <span className="ml-1.5 text-xs font-normal text-danger">สินค้าหมด</span>}</span>
                        </>
                      ) : <span className="block text-sm text-muted">ยังไม่ได้เลือก</span>}
                    </span>
                  </button>
                  {product && <button type="button" aria-label={`นำ${slot.name}ออก`} onClick={() => remove(slot.key)} className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted hover:text-danger"><CloseIcon size={14} /></button>}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt><label htmlFor="pc-budget" className="text-muted">งบประมาณ</label></dt>
              <dd><input id="pc-budget" type="number" min="1" step="1000" inputMode="numeric" placeholder="ไม่กำหนด" value={budget} onChange={(e) => setBudget(e.target.value)} className="w-28 rounded-md border border-border bg-transparent px-2 py-1 text-right tabular-nums outline-none focus-visible:border-accent" /></dd>
            </div>
            {hasBudget && <div className={`flex justify-between ${overBudget ? "text-danger" : ""}`}><dt className={overBudget ? "" : "text-muted"}>{overBudget ? "เกินงบ" : "งบคงเหลือ"}</dt><dd className="tabular-nums">{formatBaht(Math.abs(budgetValue - total))}</dd></div>}
          </dl>
          <Separator className="my-3" />
          <div className="flex items-baseline justify-between"><span className="font-medium">ราคารวม</span><span className="text-2xl font-semibold tabular-nums tracking-tight">{formatBaht(total)}</span></div>
          <p className="mt-1 text-right text-xs text-muted">ไม่รวมจอ อุปกรณ์เสริม และค่าจัดส่ง</p>
          {powerAdvice && <div role="status" className="mt-3 rounded-lg bg-surface-secondary p-3"><p className="text-sm font-medium">คำแนะนำกำลังไฟ</p><p className="mt-1 text-xs text-muted">{powerAdvice}</p></div>}
          <Button className="mt-4 hidden w-full lg:flex" isDisabled={!canCheckout} onPress={addToCart}><CartIcon size={18} />เพิ่มทั้งชุดลงตะกร้า</Button>
          {!!missing.length && <p className="mt-2 hidden text-center text-xs text-muted lg:block">เลือกอุปกรณ์อีก {missing.length} รายการเพื่อเพิ่มทั้งชุด</p>}
          {!missing.length && !!errors.length && <p className="mt-2 text-xs text-danger">มีอุปกรณ์ที่ไม่เข้ากัน กรุณาเปลี่ยนก่อนสั่งซื้อ</p>}
          <p role="status" aria-live="polite" className="mt-2 text-sm empty:hidden">{message}</p>
          {added && <Link href="/cart" className={`${buttonVariants({ variant: "secondary" })} mt-2 w-full`}>ไปที่ตะกร้า<ChevronRightIcon size={16} /></Link>}
        </div>
      </aside>

      {/* ── Right: part picker ── */}
      <section ref={pickerRef} className="min-w-0 scroll-mt-36 rounded-xl border border-border bg-surface" aria-labelledby="picker-heading">
        <div className="border-b border-border p-4 sm:p-5">
          <h2 id="picker-heading" className="text-xl font-semibold">เลือก{activeSlot.name}</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_190px]">
            <div className="relative"><SearchIcon size={16} className="pointer-events-none absolute left-3 top-2.5 text-muted" /><input aria-label={`ค้นหา${activeSlot.name}`} placeholder={`ค้นหา${activeSlot.name}...`} value={query} onChange={(e) => setQuery(e.target.value)} className={`${fieldClass} pl-9`} /></div>
            <Select aria-label="เรียงลำดับ" value={sort} onChange={(key) => { if (key) setSort(String(key)); }} className="w-full">
              <Label className="sr-only">เรียงลำดับ</Label>
              <Select.Trigger className="min-h-10 rounded-lg"><Select.Value /><Select.Indicator /></Select.Trigger>
              <Select.Popover><ListBox>{sortOptions.map((o) => <ListBox.Item key={o.id} id={o.id} textValue={o.label}>{o.label}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover>
            </Select>
          </div>
          <div className="mt-3 flex items-center justify-end gap-3 text-sm text-muted">
            <span className="shrink-0 text-xs">{candidates.length} รายการ</span>
          </div>
        </div>

        <ul className="grid grid-cols-2 gap-3 p-4 sm:p-5 md:grid-cols-3">
          {candidates.map((p) => {
            const isSelected = parts[active]?.id === p.id;
            const outOfStock = p.stock <= 0;
            return (
              <li key={p.id} className={`flex flex-col overflow-hidden rounded-lg border bg-surface ${isSelected ? "border-accent ring-1 ring-accent" : "border-border"}`}>
                <Link href={`/products/${p.slug}`} className="relative block aspect-[4/3] bg-white" tabIndex={-1} aria-hidden>
                  <Image src={p.images[0]} alt="" fill sizes="(min-width: 1280px) 260px, (min-width: 768px) 30vw, 45vw" className={`object-contain p-4 ${outOfStock ? "opacity-40" : ""}`} />
                  {outOfStock && <span className="absolute left-2 top-2 rounded bg-danger px-1.5 py-0.5 text-[11px] text-white">สินค้าหมด</span>}
                </Link>
                <div className="flex flex-1 flex-col p-3">
                  <Link href={`/products/${p.slug}`} className="line-clamp-2 text-sm leading-snug hover:text-accent">{p.name}</Link>
                  <div className="mt-auto flex items-baseline justify-between gap-2 pt-3">
                    <p className="font-semibold tabular-nums">{formatBaht(p.price)}</p>
                    {!outOfStock && <p className="text-xs text-muted">คงเหลือ {p.stock}</p>}
                  </div>
                  <Button size="sm" className="mt-2 w-full" variant={isSelected ? "secondary" : "outline"} isDisabled={!hydrated || outOfStock || isSelected} onPress={() => choose(p.id)}>{isSelected ? "เลือกอยู่" : "เลือก"}</Button>
                </div>
              </li>
            );
          })}
          {candidates.length === 0 && <li className="col-span-full px-3 py-14 text-center text-sm text-muted">{query.trim() ? "ไม่พบสินค้าตามคำค้นหา" : "ไม่มีรุ่นที่ใช้กับอุปกรณ์ที่เลือกไว้ได้ ลองเปลี่ยนอุปกรณ์ชิ้นก่อนหน้า"}</li>}
        </ul>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface px-4 py-3 lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1"><p className="text-xs text-muted">ราคารวม {selected.length}/{buildSlots.length} รายการ</p><p className="text-lg font-semibold tabular-nums">{formatBaht(total)}</p></div>
          {added ? <Link href="/cart" className={buttonVariants({ variant: "secondary" })}>ไปที่ตะกร้า</Link> : <Button isDisabled={!canCheckout} onPress={addToCart}><CartIcon size={18} />เพิ่มลงตะกร้า</Button>}
        </div>
      </div>
    </div>
  );
}
