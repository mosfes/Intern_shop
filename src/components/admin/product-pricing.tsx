"use client";

import { useState } from "react";
import { calculateProductPricing, type DiscountMode } from "@/lib/product-pricing";
import type { Product } from "@/lib/types";
import { ProductSelect } from "./product-select";

const money = (value: number) => `฿${value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const modes: { value: DiscountMode; label: string }[] = [
  { value: "none", label: "ไม่ลดราคา" },
  { value: "price", label: "กำหนดราคาขายเอง" },
  { value: "amount", label: "ลดเป็นจำนวนเงิน (บาท)" },
  { value: "percent", label: "ลดเป็นเปอร์เซ็นต์ (%)" },
];

export function ProductPricing({ product, pending, fieldClassName }: { product: Product | null; pending: boolean; fieldClassName: string }) {
  const [originalPrice, setOriginalPrice] = useState(String(product?.originalPrice ?? product?.price ?? ""));
  const [mode, setMode] = useState<DiscountMode>(product && product.price < product.originalPrice ? "price" : "none");
  const [adjustment, setAdjustment] = useState(String(product?.price ?? ""));
  const original = originalPrice === "" ? NaN : Number(originalPrice);
  const value = adjustment === "" ? NaN : Number(adjustment);
  const pricing = calculateProductPricing(original, mode, value);
  const invalid = originalPrice !== "" && (mode === "none" || adjustment !== "") && !pricing;

  function changeMode(next: string) {
    const nextMode = next as DiscountMode;
    // Keep the current sale price when changing how the discount is entered.
    if (pricing) setAdjustment(String(nextMode === "price" ? pricing.price : nextMode === "amount" ? pricing.savings : pricing.percentage));
    else setAdjustment(nextMode === "price" && Number.isFinite(original) ? String(original) : "");
    setMode(nextMode);
  }

  const adjustmentLabel = mode === "percent" ? "ส่วนลด (%)" : mode === "amount" ? "ส่วนลด (บาท)" : "ราคาขาย (บาท)";
  return <section aria-label="ราคาและส่วนลด" className="overflow-hidden rounded-xl border border-border bg-surface">
    <div className="border-b border-border px-4 py-4 sm:px-5"><h3 className="font-semibold">ราคาและส่วนลด</h3><p className="mt-1 text-xs text-muted">ตั้งราคาปกติ แล้วเลือกรูปแบบส่วนลดที่ต้องการ</p></div>
    <div className="space-y-4 p-4 sm:p-5">
      <div className="grid items-start gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">ราคาปกติ (บาท) *<input name="originalPrice" type="number" required min={0} max={100000000} step="0.01" inputMode="decimal" value={originalPrice} onChange={(event) => setOriginalPrice(event.target.value)} className={fieldClassName} placeholder="เช่น 1,000" /><span className="mt-1 block text-xs font-normal text-muted">ราคาก่อนหักส่วนลด</span></label>
        <ProductSelect label="รูปแบบส่วนลด" showLabel value={mode} onChange={changeMode} disabled={pending} options={modes} />
      </div>
      {mode !== "none" && <div className="space-y-3">
        <label className="block text-sm font-medium">{adjustmentLabel} *<input key={mode} name="pricingAdjustment" type="number" required min={0} max={mode === "percent" ? 100 : Number.isFinite(original) ? original : 100000000} step={mode === "percent" ? "any" : "0.01"} inputMode="decimal" value={adjustment} onChange={(event) => setAdjustment(event.target.value)} aria-invalid={invalid || undefined} aria-describedby={invalid ? "product-pricing-error" : undefined} className={fieldClassName} placeholder={mode === "percent" ? "เช่น 10" : mode === "amount" ? "เช่น 100" : "เช่น 900"} /></label>
        {mode === "percent" && <div className="flex flex-wrap items-center gap-2" role="group" aria-label="เลือกเปอร์เซ็นต์ส่วนลด"><span className="mr-1 text-xs text-muted">เลือกส่วนลด</span>{[5, 10, 15, 20, 25, 30, 50].map((percent) => <button key={percent} type="button" disabled={pending} aria-pressed={adjustment !== "" && value === percent} onClick={() => setAdjustment(String(percent))} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${value === percent ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:border-accent/40 hover:text-accent"}`}>{percent}%</button>)}</div>}
      </div>}
      {invalid && <p id="product-pricing-error" role="alert" className="text-sm text-danger">{mode === "percent" ? "กรอกส่วนลดระหว่าง 0–100% และราคาปกติให้ถูกต้อง" : "ราคาและส่วนลดต้องไม่ติดลบ ไม่เกินราคาปกติ และมีทศนิยมไม่เกิน 2 ตำแหน่ง"}</p>}
      <input type="hidden" name="price" value={pricing?.price ?? ""} />
      <div aria-live="polite" aria-atomic="true" className="rounded-lg bg-accent-soft/50 p-4">
        <dl className="space-y-2 text-sm">
          <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted">ราคาปกติ</dt><dd className="font-medium tabular-nums">{pricing ? money(original) : "—"}</dd></div>
          <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted">ส่วนลด</dt><dd className="font-medium tabular-nums text-accent">{pricing ? `${money(pricing.savings)} (${pricing.percentage.toLocaleString("th-TH", { maximumFractionDigits: 2 })}%)` : "—"}</dd></div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-accent/15 pt-3"><dt className="font-semibold">ราคาขายสุทธิ</dt><dd className="text-2xl font-semibold tabular-nums text-accent">{pricing ? money(pricing.price) : "—"}</dd></div>
        </dl>
      </div>
    </div>
  </section>;
}
