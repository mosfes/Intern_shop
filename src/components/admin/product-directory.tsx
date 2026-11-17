"use client";

import { useAdminDataState, useAdminFetch } from "./admin-data";

import { Chip, Modal } from "@heroui/react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { EditIcon, EyeIcon, PackageIcon, PlusIcon, SearchIcon, TrashIcon } from "@/components/icons";
import { useFeedback } from "@/components/feedback-provider";
import { formatBaht, stockStatus } from "@/lib/format";
import type { Category, Product } from "@/lib/types";
import { AdminContentSkeleton } from "./admin-skeleton";
import { AdminPageHeader } from "./user-directory";
import { ProductEditor, productField, productPrimary } from "./product-editor";
import { ProductSelect } from "./product-select";
import { ProductCategoryPicker } from "./product-category-picker";
import { ProductStock, type StockFeedback } from "./product-stock";

type Directory = { products: Product[]; categories: Category[]; brands?: { name: string; logoUrl: string | null }[] };
const PAGE_SIZE = 12;

async function readResponse(response: Response) {
  if (response.status === 401 || response.status === 403) {
    window.location.replace("/auth/complete");
    throw new Error("กรุณาตรวจสอบสิทธิ์การใช้งาน");
  }
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "ดำเนินการไม่สำเร็จ กรุณาลองอีกครั้ง");
  return result;
}

export function ProductDirectory() {
  const adminFetch = useAdminFetch("products");
  const router = useRouter();
  const showFeedback = useFeedback();
  const [data, setData] = useAdminDataState<Directory>("products");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{ product: Product | null } | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [savingStockId, setSavingStockId] = useState<string | null>(null);
  const [stockFeedback, setStockFeedback] = useState<StockFeedback | null>(null);
  const busy = pending || savingStockId !== null;

  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await readResponse(await adminFetch("/api/admin/products", { cache: "no-store" }))); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "โหลดข้อมูลสินค้าไม่สำเร็จ"); }
    finally { setLoading(false); }
  }, [adminFetch, setData]);
  useEffect(() => { const timer = window.setTimeout(() => { void refresh(); }, 0); return () => window.clearTimeout(timer); }, [refresh]);

  async function save(body: Record<string, unknown>): Promise<string | null> {
    setPending(true);
    try {
      const { product } = await readResponse(await adminFetch("/api/admin/products", {
        method: editor?.product ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      }));
      setData((current) => current && ({ ...current, products: editor?.product ? current.products.map((row) => row.id === product.id ? product : row) : [product, ...current.products] }));
      router.refresh();
      showFeedback({ title: "บันทึกสินค้าแล้ว", description: "อัปเดตข้อมูลสินค้าบนหน้าร้านเรียบร้อยแล้ว" });
      return null;
    } catch (cause) { return cause instanceof Error ? cause.message : "บันทึกสินค้าไม่สำเร็จ"; }
    finally { setPending(false); }
  }

  async function remove() {
    if (!deleting) return;
    setPending(true); setDeleteError("");
    try {
      await readResponse(await adminFetch("/api/admin/products", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deleting.id }) }));
      setData((current) => current && ({ ...current, products: current.products.filter((product) => product.id !== deleting.id) }));
      setDeleting(null); router.refresh();
      showFeedback({ title: "ลบสินค้าแล้ว", description: "นำสินค้าออกจากหน้าร้านเรียบร้อยแล้ว" });
    } catch (cause) { setDeleteError(cause instanceof Error ? cause.message : "ลบสินค้าไม่สำเร็จ"); }
    finally { setPending(false); }
  }

  async function saveStock(product: Product, stock: number) {
    if (busy) return;
    setSavingStockId(product.id); setStockFeedback(null);
    try {
      const response = await adminFetch("/api/admin/products", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, stock, expectedStock: product.stock }),
      });
      if (response.status === 409) {
        const result = await response.json();
        if (Number.isSafeInteger(result.stock)) setData((current) => current && ({ ...current, products: current.products.map((row) => row.id === product.id ? { ...row, stock: result.stock } : row) }));
        throw new Error(result.error);
      }
      const result = await readResponse(response);
      setData((current) => current && ({ ...current, products: current.products.map((row) => row.id === product.id ? { ...row, stock: result.product.stock } : row) }));
      setStockFeedback({ id: product.id, message: `บันทึกแล้ว · ${result.product.stock.toLocaleString("th-TH")} ชิ้น` });
      router.refresh();
    } catch (cause) {
      setStockFeedback({ id: product.id, message: cause instanceof Error ? cause.message : "บันทึกสต็อกไม่สำเร็จ กรุณาลองอีกครั้ง", error: true });
    } finally { setSavingStockId(null); }
  }

  if (!data && loading) return <AdminContentSkeleton section="products" />;
  const products = data?.products ?? [];
  const categories = data?.categories ?? [];
  const filtered = products.filter((product) => `${product.name} ${product.brand} ${product.slug} ${product.id}`.toLowerCase().includes(query.trim().toLowerCase()) && (!category || category === "all" || product.category === category) && (status === "all" || (status === "out" ? product.stock <= 0 : status === "low" ? product.stock > 0 && product.stock <= 5 : product.stock > 0)));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const cards = [
    { label: "สินค้าทั้งหมด", value: products.length, color: "bg-accent-soft text-accent" },
    { label: "มีสินค้า", value: products.filter((product) => product.stock > 0).length, color: "bg-success-soft text-success" },
    { label: "ใกล้หมด (1–5 ชิ้น)", value: products.filter((product) => product.stock > 0 && product.stock <= 5).length, color: "bg-warning-soft text-warning" },
    { label: "สินค้าหมด", value: products.filter((product) => product.stock <= 0).length, color: "bg-danger-soft text-danger" },
  ];
  return <div className="space-y-6">
    <AdminPageHeader title="จัดการสินค้า" description="จัดการข้อมูล ราคา และสต็อกสินค้าในหน้าร้าน" action={<button type="button" disabled={!data || !categories.length || busy || loading} onClick={() => setEditor({ product: null })} className={productPrimary}><PlusIcon size={18} />เพิ่มสินค้า</button>} />
    {error && <div role="alert" className="rounded-lg bg-danger-soft p-4 text-sm text-danger">{error}<button type="button" disabled={loading} onClick={() => void refresh()} className="ml-3 underline disabled:opacity-50">ลองใหม่</button></div>}
    {data && <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">{cards.map((card) => <div key={card.label} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 sm:p-5"><span className={`grid size-11 shrink-0 place-items-center rounded-lg ${card.color}`}><PackageIcon size={21} /></span><div><p className="text-xs text-muted sm:text-sm">{card.label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{card.value}</p></div></div>)}</div>
      <section aria-label="รายการสินค้า" className="overflow-hidden rounded-xl border border-border bg-surface" aria-busy={loading}>
        <div className="grid gap-3 border-b border-border p-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <label className="relative"><span className="sr-only">ค้นหาสินค้า</span><SearchIcon size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="ค้นหาชื่อ แบรนด์ หรือรหัสสินค้า…" className={`${productField} mt-0 pl-9`} /></label>
          <ProductCategoryPicker filter categories={categories} value={category} onChange={(value) => { setCategory(value); setPage(1); }} />
          <ProductSelect label="กรองสต็อกสินค้า" value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={[{ value: "all", label: "ทุกสถานะ" }, { value: "in", label: "มีสินค้า" }, { value: "low", label: "ใกล้หมด (1–5 ชิ้น)" }, { value: "out", label: "สินค้าหมด" }]} />
        </div>
        <p className="border-b border-border bg-surface-secondary/30 px-5 py-3 text-xs text-muted">แก้สต็อกได้ในตาราง: พิมพ์จำนวนหรือกด − / + แล้วกดบันทึก หรือ Enter · จำนวน 0 = สินค้าหมด</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm"><thead className="whitespace-nowrap border-b border-border bg-surface-secondary/50 text-xs text-muted"><tr><th scope="col" className="px-5 py-4">สินค้า</th><th scope="col" className="px-4 py-4">แหล่งข้อมูล</th><th scope="col" className="px-4 py-4">หมวดหมู่</th><th scope="col" className="px-4 py-4 text-right">ราคาขาย</th><th scope="col" className="px-4 py-4">สต็อก</th><th scope="col" className="px-4 py-4 text-right">จัดการ</th></tr></thead>
            <tbody className="divide-y divide-border">{visible.map((product) => {
              const stock = stockStatus(product.stock);
              return <tr key={product.id} className="hover:bg-surface-secondary/40">
                <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-white">{product.images?.[0] ? <Image src={product.images[0]} alt="" fill sizes="56px" className="object-contain p-1" /> : <PackageIcon className="text-muted" />}</span><div className="min-w-40 max-w-72"><p className="font-medium">{product.name}</p><p className="mt-1 text-xs text-muted">{product.brand}</p></div></div></td>
                <td className="whitespace-nowrap px-4 py-4">{product.source !== "tidb" && <Chip size="sm" color="default" variant="soft">MockAPI</Chip>}</td>
                <td className="whitespace-nowrap px-4 py-4 text-muted">{categories.find((category) => category.slug === product.category)?.nameTh ?? product.category}</td>
                <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums"><p className="font-semibold">{formatBaht(product.price)}</p>{product.originalPrice > product.price && <p className="mt-1 text-xs text-muted line-through">{formatBaht(product.originalPrice)}</p>}</td>
                <td className="px-4 py-4"><div className="space-y-2"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${stock.color === "danger" ? "bg-danger-soft text-danger" : stock.color === "warning" ? "bg-warning-soft text-warning" : "bg-success-soft text-success"}`}>{stock.label}</span><ProductStock key={`${product.id}:${product.stock}`} product={product} disabled={busy || loading} saving={savingStockId === product.id} feedback={stockFeedback?.id === product.id ? stockFeedback : null} onSave={(quantity) => saveStock(product, quantity)} /></div></td>
                <td className="px-4 py-4"><div className="flex items-center justify-end gap-1"><Link href={`/products/${product.slug}`} target="_blank" aria-label={`ดูสินค้า ${product.name}`} className="rounded-lg p-2 text-muted hover:bg-surface-secondary hover:text-accent"><EyeIcon size={17} /></Link><button type="button" disabled={busy} onClick={() => setEditor({ product })} aria-label={`แก้ไข ${product.name}`} className="rounded-lg p-2 text-muted hover:bg-accent-soft hover:text-accent disabled:opacity-50"><EditIcon size={17} /></button><button type="button" disabled={busy} aria-label={`ลบ ${product.name}`} onClick={() => { setDeleting(product); setDeleteError(""); }} className="rounded-lg p-2 text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-50"><TrashIcon size={17} /></button></div></td>
              </tr>;
            })}</tbody>
          </table>
          {!visible.length && <div className="px-6 py-14 text-center"><PackageIcon size={32} className="mx-auto text-muted" /><p className="mt-3 font-medium">ไม่พบสินค้า</p><p className="mt-1 text-sm text-muted">{products.length ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" : "เริ่มเพิ่มสินค้าเพื่อแสดงในหน้าร้าน"}</p>{!!products.length && <button type="button" onClick={() => { setQuery(""); setCategory("all"); setStatus("all"); setPage(1); }} className="mt-4 text-sm text-accent">ล้างตัวกรอง</button>}</div>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 text-xs text-muted"><p role="status">แสดง {filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} จาก {filtered.length} รายการ</p><div className="flex items-center gap-3"><button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="rounded-md border border-border px-3 py-2 hover:bg-surface-secondary disabled:opacity-40">ก่อนหน้า</button><span>{currentPage} / {pages}</span><button type="button" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)} className="rounded-md border border-border px-3 py-2 hover:bg-surface-secondary disabled:opacity-40">ถัดไป</button></div></div>
      </section>
    </>}
    {editor && <ProductEditor product={editor.product} categories={categories} brands={(data?.brands ?? []).map((brand) => brand.name)} pending={pending} onSave={save} onClose={() => setEditor(null)} />}
    <Modal.Backdrop isOpen={!!deleting} onOpenChange={(open) => { if (!open && !pending) setDeleting(null); }}>
      <Modal.Container size="sm" placement="center"><Modal.Dialog className="rounded-2xl bg-overlay p-0 text-foreground"><Modal.CloseTrigger isDisabled={pending} /><Modal.Header className="px-6 pt-6"><Modal.Heading>ลบสินค้า</Modal.Heading></Modal.Header><Modal.Body className="px-6 py-4"><p className="break-words text-sm">ต้องการลบ <strong>{deleting?.name}</strong> หรือไม่?</p><p className="mt-2 text-sm text-muted">สินค้าจะถูกนำออกจากหน้าร้านและไม่สามารถกู้คืนได้</p>{deleteError && <p role="alert" className="mt-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">{deleteError}</p>}</Modal.Body><Modal.Footer className="flex justify-end gap-4 border-t border-border px-6 py-4"><button type="button" disabled={pending} onClick={() => setDeleting(null)} className="text-sm text-muted disabled:opacity-50">ยกเลิก</button><button type="button" disabled={pending} onClick={() => void remove()} className="rounded-lg bg-danger px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "กำลังลบ…" : "ยืนยันลบสินค้า"}</button></Modal.Footer></Modal.Dialog></Modal.Container>
    </Modal.Backdrop>
  </div>;
}
