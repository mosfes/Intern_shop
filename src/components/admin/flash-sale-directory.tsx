"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useFeedback } from "@/components/feedback-provider";
import { formatBaht } from "@/lib/format";
import { validateFlashSalePrice, type FlashSaleOffer } from "@/lib/flash-sale";
import type { Product } from "@/lib/types";
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
  const router = useRouter(); const feedback = useFeedback();
  const [data, setData] = useState<{ products: Product[]; offers: FlashSaleOffer[] } | null>(null);
  const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false); const [query, setQuery] = useState("");
  const [adding, setAdding] = useState<Product | null>(null); const [price, setPrice] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [catalog, sale] = await Promise.all([fetch("/api/admin/products", { cache: "no-store" }).then(read), fetch("/api/admin/flash-sale", { cache: "no-store" }).then(read)]);
      setData({ products: catalog.products, offers: sale.offers });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "โหลดสินค้าไม่สำเร็จ"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => { void refresh(); }, 0); return () => window.clearTimeout(timer); }, [refresh]);

  async function save(id: string, active: boolean, value?: number) {
    setPending(true); setError("");
    try {
      await read(await fetch("/api/admin/flash-sale", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, active, price: value }) }));
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
  if (loading && !data) return <AdminContentSkeleton section="flash-sale" />;
  const selectedIds = new Set(data?.offers.map((offer) => offer.productId));
  const matches = query.trim() ? (data?.products ?? []).filter((p) => !selectedIds.has(p.id) && `${p.name} ${p.brand} ${p.id}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6) : [];
  return <div className="space-y-5">
    <AdminPageHeader title="แฟลชเซล" description="ตั้งเวลา เลือกสินค้า และกำหนดราคาพิเศษ" />
    <FlashSaleSchedule />
    {error && <div role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}{!data && <button type="button" disabled={loading} onClick={() => void refresh()} className="ml-3 underline">ลองใหม่</button>}</div>}
    {data && <section aria-label="สินค้าแฟลชเซล" className="rounded-xl border border-border bg-surface p-5">
      <h2 className="font-semibold">สินค้าแฟลชเซล <span className="font-normal text-muted">({data.offers.length})</span></h2>
      <form onSubmit={add} className="mt-4 space-y-3 rounded-lg bg-surface-secondary/50 p-3">
        <label className="block text-sm">เพิ่มสินค้า<input disabled={pending} value={query} onChange={(event) => { setQuery(event.target.value); setAdding(null); setPrice(""); }} placeholder="ค้นหาชื่อสินค้า…" className={productField} /></label>
        {query.trim() && !adding && <ul aria-label="ผลการค้นหาสินค้า" className="max-h-60 overflow-y-auto rounded-lg border border-border bg-surface">{matches.map((product) => <li key={product.id}><button type="button" disabled={pending} onClick={() => { setAdding(product); setQuery(product.name); setPrice(""); }} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent-soft"><span>{product.name}</span><span className="shrink-0 text-muted">{formatBaht(product.price)}</span></button></li>)}{!matches.length && <li className="p-3 text-sm text-muted">ไม่พบสินค้า หรือเพิ่มเข้าแฟลชเซลแล้ว</li>}</ul>}
        {adding && <div className="flex flex-wrap items-end gap-3"><label className="min-w-40 flex-1 text-sm">ราคาแฟลชเซล (บาท)<input type="number" required min="0.01" max={adding.price - 0.01} step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} disabled={pending} className={productField} placeholder={`ต่ำกว่า ${formatBaht(adding.price)}`} /></label><button type="submit" disabled={pending} className={productPrimary}>เพิ่มสินค้า</button></div>}
      </form>
      <ul className="mt-3 divide-y divide-border">{data.offers.map((offer) => <FlashSaleRow key={`${offer.productId}:${offer.price}`} offer={offer} product={data.products.find((p) => p.id === offer.productId)} pending={pending} onSave={save} />)}</ul>
      {!data.offers.length && <p className="py-8 text-center text-sm text-muted">ยังไม่มีสินค้า ค้นหาเพื่อเพิ่มเข้าแฟลชเซล</p>}
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
