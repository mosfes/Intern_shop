"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Chip, Skeleton } from "@heroui/react";
import { CalendarIcon, CartIcon, ChevronRightIcon, CreditCardIcon, PackageIcon, TruckIcon } from "@/components/icons";
import { orderStatusLabel, ORDER_STATUSES } from "@/lib/admin-orders";
import { TOP_PRODUCT_DAYS, type AdminOverview } from "@/lib/admin-overview";
import type { OrderStatus } from "@/lib/types";
import type { AdminSection } from "./admin-shell";

const baht = (value: number) => `฿${Math.round(value).toLocaleString("th-TH")}`;
const shortDay = (date: string) => new Date(`${date}T00:00:00+07:00`).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short" });
const dateTime = (value: string) => new Date(value).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" });
const statusColor: Record<OrderStatus, "warning" | "accent" | "success" | "danger"> = { processing: "warning", shipped: "accent", delivered: "success", cancelled: "danger" };
const statusBar: Record<OrderStatus, string> = { processing: "bg-warning", shipped: "bg-accent", delivered: "bg-success", cancelled: "bg-danger" };

function change(current: number, previous: number) {
  if (!previous) return current ? { text: "ใหม่เดือนนี้", up: true } : null;
  const percent = ((current - previous) / previous) * 100;
  return { text: `${percent >= 0 ? "+" : ""}${percent.toFixed(1)}% จากเดือนก่อน`, up: percent >= 0 };
}

export function SalesOverview({ onNavigate }: { onNavigate: (section: AdminSection) => void }) {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/admin/overview", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result);
    } catch (cause) { setError(cause instanceof Error && cause.message ? cause.message : "โหลดภาพรวมไม่สำเร็จ"); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  if (error) return <div role="alert" className="rounded-lg bg-danger-soft p-4 text-danger">{error} <button className="underline" onClick={() => void load()}>ลองใหม่</button></div>;
  if (!data) return (
    <div className="space-y-6" aria-busy="true">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="space-y-2 rounded-xl border border-border bg-surface p-4 sm:p-5"><Skeleton className="h-4 w-24 rounded-md" /><Skeleton className="h-7 w-28 rounded-md" /><Skeleton className="h-3 w-32 max-w-full rounded-md" /></div>)}</div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );

  const monthChange = change(data.revenue.month, data.revenue.lastMonth);
  const peak = Math.max(...data.daily.map((day) => day.revenue), 1);
  const trendTotal = data.daily.reduce((sum, day) => sum + day.revenue, 0);
  const trendOrders = data.daily.reduce((sum, day) => sum + day.orders, 0);
  const waiting = data.orders.byStatus.processing;

  const tiles = [
    { title: "ยอดขายเดือนนี้", value: baht(data.revenue.month), detail: monthChange?.text ?? "ยังไม่มียอดขาย", tone: monthChange ? (monthChange.up ? "text-success" : "text-danger") : "text-muted", icon: CreditCardIcon },
    { title: "ยอดขายวันนี้", value: baht(data.revenue.today), detail: `${data.orders.today.toLocaleString("th-TH")} คำสั่งซื้อวันนี้`, tone: "text-muted", icon: CalendarIcon },
    { title: "คำสั่งซื้อเดือนนี้", value: data.orders.month.toLocaleString("th-TH"), detail: `เฉลี่ย ${baht(data.orders.averageValue)} / คำสั่งซื้อ`, tone: "text-muted", icon: CartIcon },
    { title: "ยอดขายรวมทั้งหมด", value: baht(data.revenue.total), detail: `${data.orders.total.toLocaleString("th-TH")} คำสั่งซื้อที่ชำระแล้ว`, tone: "text-muted", icon: PackageIcon },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {tiles.map((tile) => (
          <section key={tile.title} className="flex min-w-0 items-start gap-3 rounded-xl border border-border bg-surface p-4 sm:gap-4 sm:p-5">
            <span className="hidden size-11 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent sm:grid"><tile.icon size={21} /></span>
            <div className="min-w-0 flex-1"><p className="text-sm text-muted">{tile.title}</p><p className="mt-1 truncate text-xl font-semibold tabular-nums sm:text-2xl">{tile.value}</p><p className={`mt-1 truncate text-xs ${tile.tone}`}>{tile.detail}</p></div>
          </section>
        ))}
      </div>

      {waiting > 0 && (
        <button onClick={() => onNavigate("orders")} className="flex w-full items-center gap-3 rounded-xl border border-warning/40 bg-warning-soft p-4 text-left hover:border-warning">
          <TruckIcon size={20} className="shrink-0 text-warning" />
          <span className="min-w-0 flex-1 text-sm"><span className="font-semibold">{waiting.toLocaleString("th-TH")} คำสั่งซื้อรอจัดส่ง</span> <span className="text-muted">— ชำระเงินแล้ว รอเตรียมสินค้าและใส่เลขพัสดุ</span></span>
          <ChevronRightIcon size={16} className="shrink-0 text-muted" />
        </button>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-lg font-semibold">ยอดขาย {data.daily.length} วันล่าสุด</h2><p className="mt-1 text-sm text-muted">{baht(trendTotal)} · {trendOrders.toLocaleString("th-TH")} คำสั่งซื้อ (ไม่รวมที่ยกเลิก)</p></div></div>
          <div className="mt-6 flex h-48 items-end gap-1 sm:gap-1.5" role="img" aria-label={`กราฟยอดขายรายวัน ${data.daily.length} วันล่าสุด`}>
            {data.daily.map((day) => (
              <div key={day.date} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end">
                <div className={`w-full rounded-t-[3px] ${day.revenue ? "bg-accent group-hover:bg-accent/80" : "bg-surface-secondary"}`} style={{ height: day.revenue ? `${Math.max((day.revenue / peak) * 100, 3)}%` : "2px" }} />
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-xs shadow-md group-hover:block"><p className="font-medium">{shortDay(day.date)}</p><p className="tabular-nums">{baht(day.revenue)} · {day.orders} รายการ</p></div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted"><span>{shortDay(data.daily[0].date)}</span><span>{shortDay(data.daily[data.daily.length - 1].date)}</span></div>
        </section>

        <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">สถานะคำสั่งซื้อ</h2><button className="text-sm text-accent hover:underline" onClick={() => onNavigate("orders")}>ดูทั้งหมด</button></div>
          <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-surface-secondary">{data.orders.total > 0 && ORDER_STATUSES.map((status) => <div key={status} className={statusBar[status]} style={{ width: `${(data.orders.byStatus[status] / data.orders.total) * 100}%` }} />)}</div>
          <ul className="mt-5 space-y-3">{ORDER_STATUSES.map((status) => <li key={status} className="flex items-center gap-3 text-sm"><span className={`size-2.5 shrink-0 rounded-full ${statusBar[status]}`} /><span className="flex-1">{orderStatusLabel[status]}</span><span className="font-semibold tabular-nums">{data.orders.byStatus[status].toLocaleString("th-TH")}</span></li>)}</ul>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">คำสั่งซื้อล่าสุด</h2><button className="text-sm text-accent hover:underline" onClick={() => onNavigate("orders")}>จัดการคำสั่งซื้อ</button></div>
          {data.recentOrders.length === 0 ? <p className="py-8 text-center text-sm text-muted">ยังไม่มีคำสั่งซื้อที่ชำระเงินแล้ว</p> : (
            <ul className="mt-4 divide-y divide-border">{data.recentOrders.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center gap-3 py-3.5">
                <div className="min-w-0 flex-1"><p className="truncate font-mono text-sm font-medium">{order.orderId}</p><p className="mt-0.5 text-xs text-muted">{dateTime(order.createdAt)} · {order.items} ชิ้น</p></div>
                <Chip size="sm" variant="soft" color={statusColor[order.status]}>{orderStatusLabel[order.status]}</Chip>
                <span className="w-24 text-right text-sm font-semibold tabular-nums">{baht(order.total)}</span>
              </li>
            ))}</ul>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="text-lg font-semibold">สินค้าขายดี {TOP_PRODUCT_DAYS} วันล่าสุด</h2>
            {data.topProducts.length === 0 ? <p className="py-6 text-center text-sm text-muted">ยังไม่มีข้อมูลการขาย</p> : (
              <ol className="mt-4 space-y-3">{data.topProducts.map((product, index) => (
                <li key={product.productId} className="flex items-center gap-3">
                  <span className="w-4 text-center text-sm font-semibold text-muted tabular-nums">{index + 1}</span>
                  <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-white">{product.image ? <Image src={product.image} alt="" fill sizes="40px" className="object-contain p-1" /> : <PackageIcon size={16} className="text-muted" />}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{product.name}</p><p className="text-xs text-muted tabular-nums">ขายแล้ว {product.quantity.toLocaleString("th-TH")} ชิ้น · {baht(product.revenue)}</p></div>
                </li>
              ))}</ol>
            )}
          </section>

          <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">สินค้าใกล้หมด</h2><button className="text-sm text-accent hover:underline" onClick={() => onNavigate("products")}>จัดการสินค้า</button></div>
            {data.lowStock.length === 0 ? <p className="py-6 text-center text-sm text-muted">สต็อกสินค้าทุกรายการยังเพียงพอ</p> : (
              <ul className="mt-4 space-y-2.5">{data.lowStock.map((product) => (
                <li key={product.id} className="flex items-center gap-3 text-sm"><span className="min-w-0 flex-1 truncate">{product.name}</span><Chip size="sm" variant="soft" color={product.stock === 0 ? "danger" : "warning"}>{product.stock === 0 ? "หมด" : `เหลือ ${product.stock}`}</Chip></li>
              ))}</ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
