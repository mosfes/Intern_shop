"use client";

import { useAdminDataState, useAdminFetch } from "./admin-data";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Modal } from "@heroui/react";
import { PackageIcon } from "@/components/icons";
import { formatBaht } from "@/lib/format";
import { orderStatusLabel } from "@/lib/admin-orders";
import type { CustomerShopping } from "@/lib/admin-customer-shopping";
import type { Row } from "./user-directory";

const date = (value: string) => new Date(value).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
const paymentStatus: Record<string, string> = { successful: "ชำระเงินสำเร็จ", pending: "รอชำระเงิน / รอยืนยัน", failed: "ชำระเงินไม่สำเร็จ" };
const orderStatus: Record<string, string> = orderStatusLabel;
const actionClass = "rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-secondary disabled:opacity-50";

function ProductThumbnail({ src }: { src?: string | null }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-white">
    {src && src !== failedSrc ? <Image src={src} alt="" fill sizes="64px" className="object-contain p-1" onError={() => setFailedSrc(src)} /> : <PackageIcon size={24} className="text-muted" />}
  </span>;
}

export function CustomerShoppingDialog({ customer, onClose }: { customer: Row; onClose: () => void }) {
  const [tab, setTab] = useState<"cart" | "orders">("cart");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const cacheKey = `shopping:${customer.id}:${page}`;
  const [data, setData] = useAdminDataState<CustomerShopping>(cacheKey);
  const adminFetch = useAdminFetch(cacheKey);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await adminFetch(`/api/admin/users/${encodeURIComponent(customer.id)}/shopping?page=${page}`, { cache: "no-store", signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "โหลดข้อมูลไม่สำเร็จ");
        if (!controller.signal.aborted) setData(result);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [customer.id, page, reload, adminFetch, setData]);

  function load(nextPage = page) {
    setLoading(true); setError(""); setPage(nextPage); setReload((value) => value + 1);
  }
  const subtotal = data?.cart.reduce((sum, line) => sum + (line.price ?? 0) * line.quantity, 0) ?? 0;
  const pricesComplete = data?.cart.every((line) => line.price !== null);

  return <Modal.Backdrop isOpen onOpenChange={(open) => { if (!open) onClose(); }}>
    <Modal.Container size="lg" placement="center" scroll="inside">
      <Modal.Dialog className="w-full max-w-[900px] overflow-hidden rounded-2xl bg-overlay p-0 text-foreground shadow-2xl">
        <Modal.CloseTrigger className="text-muted" />
        <Modal.Header className="border-b border-border px-6 py-5 pr-12">
          <Modal.Heading className="text-lg font-semibold">ตะกร้าและคำสั่งซื้อ · {customer.name}</Modal.Heading>
          <p className="mt-1 break-all text-sm text-muted">{customer.email}{customer.phone && ` · ${customer.phone}`}</p>
        </Modal.Header>
        <Modal.Body className="m-0 space-y-5 px-6 py-5 text-foreground">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" aria-pressed={tab === "cart"} onClick={() => setTab("cart")} className={`${actionClass} ${tab === "cart" ? "bg-accent-soft text-accent" : ""}`}>ตะกร้า{data && ` (${data.cart.length})`}</button>
            <button type="button" aria-pressed={tab === "orders"} onClick={() => setTab("orders")} className={`${actionClass} ${tab === "orders" ? "bg-accent-soft text-accent" : ""}`}>คำสั่งซื้อ / การชำระเงิน{data && ` (${data.totalOrders})`}</button>
            <button type="button" disabled={loading} onClick={() => load()} className={`${actionClass} ml-auto`}>รีเฟรช</button>
          </div>
          {loading && !data && <p role="status" className="py-10 text-center text-sm text-muted">กำลังโหลดข้อมูลลูกค้า…</p>}
          {error && <div role="alert" className="rounded-lg bg-danger-soft p-4 text-sm text-danger">{error} <button type="button" onClick={() => load()} className="underline">ลองใหม่</button></div>}
          {data && tab === "cart" && <section aria-label="ตะกร้าของลูกค้า" className="space-y-4">
            <p className="text-xs text-muted">ตะกร้าที่บันทึกไว้กับบัญชี · ราคาเป็นราคาปัจจุบัน ยังไม่รวมส่วนลดและค่าจัดส่ง</p>
            {data.cart.length === 0 ? <p className="py-10 text-center text-muted">ไม่มีสินค้าในตะกร้า</p> : <>
              <ul className="divide-y divide-border">{data.cart.map((line) => <li key={line.productId} className="flex flex-wrap justify-between gap-3 py-4">
                <ProductThumbnail src={line.image} />
                <div className="min-w-0 flex-1">
                  {line.slug ? <Link href={`/products/${encodeURIComponent(line.slug)}`} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-accent hover:underline">{line.name}</Link> : <p className="font-medium">{line.availability === "removed" ? "สินค้าไม่มีจำหน่ายแล้ว" : "โหลดข้อมูลสินค้าไม่ได้"}</p>}
                  <p className="mt-1 break-all text-xs text-muted">รหัสสินค้า: {line.productId} · {line.selected ? "เลือกสำหรับชำระเงิน" : "ยังไม่เลือกชำระเงิน"}</p>
                  <p className="mt-1 text-xs text-muted">อัปเดต {date(line.updatedAt)}</p>
                </div>
                <div className="text-right text-sm"><p>{line.quantity} ชิ้น × {line.price === null ? "ไม่ทราบราคา" : formatBaht(line.price)}</p><p className="mt-1 font-semibold">{line.price === null ? "—" : formatBaht(line.price * line.quantity)}</p></div>
              </li>)}</ul>
              <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4 text-sm font-semibold"><span>รวม {data.cart.reduce((sum, line) => sum + line.quantity, 0)} ชิ้น{!pricesComplete && " (เฉพาะสินค้าที่ทราบราคา)"}</span><span>{formatBaht(subtotal)}</span></div>
            </>}
          </section>}
          {data && tab === "orders" && <section aria-label="คำสั่งซื้อของลูกค้า" className="space-y-4">
            <p className="text-xs text-muted">แสดงรายการที่บันทึกในระบบ รวมรายการรอชำระเงินและชำระเงินไม่สำเร็จ · สถานะตามข้อมูลที่ระบบได้รับล่าสุด</p>
            {data.totalOrders === 0 ? <p className="py-10 text-center text-muted">ยังไม่มีคำสั่งซื้อหรือรายการชำระเงิน</p> : <>
              {data.orders.map((payment) => <details key={payment.id} className="rounded-xl border border-border">
                <summary className="cursor-pointer space-y-2 p-4 text-sm focus-visible:outline-accent">
                  <span className="font-semibold">{payment.order.id}</span>
                  <span className={`ml-2 inline-block rounded-full px-2 py-1 text-xs ${payment.status === "successful" ? "bg-success-soft text-success" : payment.status === "failed" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"}`}>{paymentStatus[payment.status] ?? payment.status}</span>
                  <span className="flex flex-wrap justify-between gap-2 text-muted"><span>{date(payment.createdAt)} · {payment.order.lines.reduce((sum, line) => sum + line.quantity, 0)} ชิ้น</span><span className="font-semibold text-foreground">{formatBaht(payment.amount)}</span></span>
                </summary>
                <div className="space-y-4 border-t border-border p-4 text-sm">
                  {payment.status === "successful" && <p>สถานะคำสั่งซื้อ: {orderStatus[payment.order.status] ?? payment.order.status}{payment.order.trackingNumber && ` · เลขพัสดุ ${payment.order.trackingNumber}`}</p>}
                  <ul className="divide-y divide-border">{payment.order.lines.map((line, index) => <li key={`${line.productId}-${index}`} className="flex flex-wrap items-start gap-3 py-3"><ProductThumbnail src={line.image} /><div className="min-w-0 flex-1"><p className="break-words font-medium">{line.name}</p><p className="mt-1 break-all text-xs text-muted">{line.productId} · {line.quantity} ชิ้น × {formatBaht(line.price)}</p></div><span className="ml-auto shrink-0">{formatBaht(line.price * line.quantity)}</span></li>)}</ul>
                  <dl className="grid grid-cols-[1fr_auto] gap-2 border-t border-border pt-3"><dt>ยอดสินค้า</dt><dd>{formatBaht(payment.order.subtotal)}</dd><dt>ส่วนลด{payment.order.discountCode && ` (${payment.order.discountCode})`}</dt><dd>−{formatBaht(payment.order.discount ?? 0)}</dd><dt>ค่าจัดส่ง</dt><dd>{formatBaht(payment.order.shipping)}</dd><dt className="font-semibold">ยอดชำระ</dt><dd className="font-semibold">{formatBaht(payment.amount)}</dd></dl>
                  <div className="space-y-2 rounded-lg bg-surface-secondary p-3"><p>วิธีชำระเงิน: {payment.order.paymentMethod}</p><p>การจัดส่ง: {payment.order.shippingMethod}</p><p className="whitespace-pre-wrap break-words">ที่อยู่: {payment.order.address}</p></div>
                  <p className="break-all text-xs text-muted">รหัสรายการ: {payment.id}{payment.chargeId && ` · รหัสชำระเงิน: ${payment.chargeId}`}</p>
                </div>
              </details>)}
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span>หน้า {data.page} / {Math.max(1, Math.ceil(data.totalOrders / data.pageSize))} · {data.totalOrders} รายการ</span><div className="flex gap-2"><button type="button" className={actionClass} disabled={page <= 1} onClick={() => load(page - 1)}>ก่อนหน้า</button><button type="button" className={actionClass} disabled={page * data.pageSize >= data.totalOrders} onClick={() => load(page + 1)}>ถัดไป</button></div></div>
            </>}
          </section>}
        </Modal.Body>
        <Modal.Footer className="border-t border-border px-6 py-4"><button type="button" onClick={onClose} className={actionClass}>ปิด</button></Modal.Footer>
      </Modal.Dialog>
    </Modal.Container>
  </Modal.Backdrop>;
}
