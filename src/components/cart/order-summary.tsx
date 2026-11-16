import { Separator } from "@heroui/react";
import type { ReactNode } from "react";
import { FREE_SHIPPING_THRESHOLD, formatBaht } from "@/lib/format";

export function OrderSummary({
  subtotal,
  savings,
  shipping,
  shippingLabel = "ค่าจัดส่ง",
  children,
  lines,
}: {
  subtotal: number;
  savings: number;
  shipping: number | null;
  shippingLabel?: string;
  children?: ReactNode;
  lines?: ReactNode;
}) {
  const total = subtotal + (shipping ?? 0);
  const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
  return (
    <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold">สรุปคำสั่งซื้อ</h2>
      {lines}
      <dl className="space-y-2.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">ยอดรวมสินค้า</dt>
          <dd className="tabular-nums">{formatBaht(subtotal + savings)}</dd>
        </div>
        {savings > 0 && (
          <div className="flex justify-between text-success">
            <dt>ส่วนลด</dt>
            <dd className="tabular-nums">-{formatBaht(savings)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-muted">{shippingLabel}</dt>
          <dd className="tabular-nums">{shipping === null ? "คำนวณในขั้นตอนถัดไป" : shipping === 0 ? "ฟรี" : formatBaht(shipping)}</dd>
        </div>
      </dl>
      {remaining > 0 && subtotal > 0 && (
        <p className="mt-3 rounded-xl bg-accent-soft px-3 py-2 text-xs text-accent-soft-foreground">
          ซื้อเพิ่มอีก {formatBaht(remaining)} เพื่อรับสิทธิ์จัดส่งมาตรฐานฟรี
        </p>
      )}
      <Separator className="my-4" />
      <div className="flex items-baseline justify-between">
        <span className="font-medium">ยอดชำระทั้งหมด</span>
        <span className="text-2xl font-semibold tabular-nums tracking-tight">{formatBaht(total)}</span>
      </div>
      <p className="mt-1 text-right text-xs text-muted">รวมภาษีมูลค่าเพิ่มแล้ว</p>
      {children && <div className="mt-5 space-y-3">{children}</div>}
    </div>
  );
}
