"use client";

import { useAdminDataState, useAdminFetch } from "./admin-data";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useFeedback } from "@/components/feedback-provider";
import { PackageIcon } from "@/components/icons";
import { formatBaht } from "@/lib/format";
import { validateFlashSalePrice, type FlashSaleOffer } from "@/lib/flash-sale";
import type { Category, Product } from "@/lib/types";
import { AdminContentSkeleton } from "./admin-skeleton";
import { AdminPageHeader } from "./user-directory";
import { productField, productPrimary } from "./product-editor";
import { FlashSaleSchedule } from "./flash-sale-schedule";

async function read(response: Response) {
  if (response.status === 401 || response.status === 403) { window.location.replace("/auth/complete"); throw new Error("กรุณาตรวจสอบสิทธิ์การใช้งาน"); }
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "ดำเนินการไม่สำเร็จ กรุณาลองอีกครั้ง");
  return result;
}

export function FlashSaleDirectory() {
  const adminFetch = useAdminFetch("flash-sale");
  const router = useRouter(); const feedback = useFeedback();
  const [data, setData] = useAdminDataState<{ products: Product[]; categories?: Category[]; offers: FlashSaleOffer[] }>("flash-sale");
  const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false); const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all"); const [managing, setManaging] = useState(false);
  const [adding, setAdding] = useState<Product | null>(null); const [price, setPrice] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [catalog, sale] = await Promise.all([adminFetch("/api/admin/products", { cache: "no-store" }).then(read), adminFetch("/api/admin/flash-sale", { cache: "no-store" }).then(read)]);
      setData({ products: catalog.products, categories: catalog.categories, offers: sale.offers });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "โหลดสินค้าไม่สำเร็จ"); }
    finally { setLoading(false); }
  }, [adminFetch, setData]);
  useEffect(() => { const timer = window.setTimeout(() => { void refresh(); }, 0); return () => window.clearTimeout(timer); }, [refresh]);

  async function save(id: string, active: boolean, value?: number) {
    setPending(true); setError("");
    try {
      await read(await adminFetch("/api/admin/flash-sale", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, active, price: value }) }));
      setData((current) => current && ({ ...current, offers: active ? current.offers.some((offer) => offer.productId === id) ? current.offers.map((offer) => offer.productId === id ? { ...offer, price: value! } : offer) : [...current.offers, { productId: id, price: value! }] : current.offers.filter((offer) => offer.productId !== id) }));
      router.refresh(); feedback({ title: active ? "บันทึกราคาแฟลชเซลแล้ว" : "นำสินค้าออกแล้ว", description: "อัปเดตหน้าร้านเรียบร้อยแล้ว" });
      return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "บันทึกไม่สำเร็จ"); return false; }
    finally { setPending(false); }
  }
  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!adding) return;
    try {
      const value = validateFlashSalePrice(Number(price), adding.price);
      if (await save(adding.id, true, value)) { setAdding(null); setQuery(""); setPrice(""); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "กรุณาตรวจสอบราคา"); }
  }
  const selectedIds = new Set(data?.offers.map((offer) => offer.productId));
  const matches = (data?.products ?? []).filter((p) => !selectedIds.has(p.id) && (category === "all" || p.category === category) && `${p.name} ${p.brand} ${p.id}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="space-y-5">
    <AdminPageHeader title="แฟลชเซล" description="ตั้งเวลา เลือกสินค้า และกำหนดราคาพิเศษ" />
    <FlashSaleSchedule />
    {loading && !data && <AdminContentSkeleton section="flash-sale" includeHeading={false} />}
    {error && <div role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}{!data && <button type="button" disabled={loading} onClick={() => void refresh()} className="ml-3 underline">ลองใหม่</button>}</div>}
    {data && <section aria-label="สินค้าแฟลชเซล" className="rounded-xl border border-border bg-surface p-5">
      <h2 className="font-semibold">สินค้าแฟลชเซล <span className="font-normal text-muted">({data.offers.length})</span></h2>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">จัดการสินค้าและราคาพิเศษที่แสดงบนหน้าร้าน</p>
        <button type="button" disabled={pending} onClick={() => { setManaging(!managing); setAdding(null); setQuery(""); setPrice(""); }} className={productPrimary}>{managing ? "ปิดเมนูเพิ่มสินค้า" : "+ จัดการเพิ่มสินค้า"}</button>
      </div>
      {managing && <form onSubmit={add} className="mt-4 space-y-3 rounded-lg border border-border bg-surface-secondary/50 p-4">
        <div><h3 className="font-semibold">เลือกสินค้าเข้าแฟลชเซล</h3><p className="mt-1 text-sm text-muted">ค้นหาหรือเลือกหมวดหมู่ แล้วเลือกสินค้าเพื่อกำหนดราคา</p></div>
        {!adding && <><div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"><label className="text-sm">ค้นหาสินค้า<input disabled={pending} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาชื่อ แบรนด์ หรือรหัสสินค้า…" className={productField} /></label><label className="text-sm">หมวดหมู่<select disabled={pending} value={category} onChange={(event) => setCategory(event.target.value)} className={productField}><option value="all">ทุกหมวดหมู่</option>{(data.categories ?? []).map((item) => <option key={item.slug} value={item.slug}>{item.nameTh || item.name}</option>)}</select></label></div>
          <p className="text-sm text-muted">สินค้าที่เลือกได้ {matches.length} รายการ</p>
          <ul aria-label="สินค้าที่เลือกได้" className="max-h-96 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-surface">{matches.map((product) => <li key={product.id}><button type="button" disabled={pending} onClick={() => { setAdding(product); setPrice(""); }} className="flex w-full items-center gap-3 p-3 text-left hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"><span className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-white">{product.images?.[0] ? <Image src={product.images[0]} alt="" fill sizes="56px" className="object-contain p-1" /> : <PackageIcon className="text-muted" />}</span><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{product.name}</span><span className="mt-1 block text-xs text-muted">{product.brand} · {data.categories?.find((item) => item.slug === product.category)?.nameTh || product.category}</span></span><span className="shrink-0 text-right text-sm font-semibold">{formatBaht(product.price)}<span className="mt-1 block font-normal text-accent">เลือกสินค้า</span></span></button></li>)}{!matches.length && <li className="p-4 text-center text-sm text-muted">{query.trim() || category !== "all" ? "ไม่พบสินค้าที่ตรงกับตัวกรอง" : "ไม่มีสินค้าที่สามารถเพิ่มเข้าแฟลชเซล"}</li>}</ul></>}
        {adding && <><div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3"><span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-white">{adding.images?.[0] ? <Image src={adding.images[0]} alt="" fill sizes="64px" className="object-contain p-1" /> : <PackageIcon className="text-muted" />}</span><div className="min-w-0 flex-1"><p className="text-sm font-medium">{adding.name}</p><p className="mt-1 text-sm text-muted">ราคาปกติ {formatBaht(adding.price)}</p></div><button type="button" disabled={pending} onClick={() => { setAdding(null); setPrice(""); }} className="text-sm text-accent underline">เปลี่ยนสินค้า</button></div><div className="flex flex-wrap items-end gap-3"><label className="min-w-40 flex-1 text-sm">ราคาแฟลชเซล (บาท)<input type="number" required min="0.01" max={adding.price - 0.01} step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} disabled={pending} className={productField} placeholder={`ต่ำกว่า ${formatBaht(adding.price)}`} /></label><button type="submit" disabled={pending} className={productPrimary}>เพิ่มสินค้า</button></div></>}
      </form>}
      <ul className="mt-3 divide-y divide-border">{data.offers.map((offer) => <FlashSaleRow key={`${offer.productId}:${offer.price}`} offer={offer} product={data.products.find((p) => p.id === offer.productId)} pending={pending} onSave={save} />)}</ul>
      {!data.offers.length && <p className="py-8 text-center text-sm text-muted">ยังไม่มีสินค้าในแฟลชเซล กดจัดการเพิ่มสินค้าเพื่อเริ่มต้น</p>}
    </section>}
  </div>;
}

function FlashSaleRow({ offer, product, pending, onSave }: { offer: FlashSaleOffer; product?: Product; pending: boolean; onSave: (id: string, active: boolean, price?: number) => Promise<boolean> }) {
  const [price, setPrice] = useState(String(offer.price));
  const changed = Number(price) !== offer.price;
  return <li className="flex flex-wrap items-center gap-3 py-4">
    {product?.images[0] && <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border bg-white"><Image src={product.images[0]} alt="" fill sizes="48px" className="object-contain p-1" /></div>}
    <div className="min-w-0 flex-1 basis-40"><p className="line-clamp-2 text-sm font-medium">{product?.name ?? "สินค้าถูกลบแล้ว"}</p>{product && <p className="mt-1 text-xs text-muted">ราคาปกติ {formatBaht(product.price)}</p>}</div>
    {product && <form onSubmit={(event) => { event.preventDefault(); void onSave(offer.productId, true, Number(price)); }} className="flex items-end gap-2"><label className="w-32 text-xs text-muted">แฟลชเซล (บาท)<input type="number" required min="0.01" max={product.price - 0.01} step="0.01" disabled={pending} value={price} onChange={(event) => setPrice(event.target.value)} className={productField} /></label>{changed && <button type="submit" disabled={pending} className="rounded-lg bg-accent px-3 py-2.5 text-sm text-white disabled:opacity-50">บันทึก</button>}</form>}
    <button type="button" aria-label={`นำ ${product?.name ?? offer.productId} ออกจากแฟลชเซล`} disabled={pending} onClick={() => void onSave(offer.productId, false)} className="rounded-lg px-2 py-2 text-sm text-danger hover:bg-danger-soft disabled:opacity-50">นำออก</button>
  </li>;
}
