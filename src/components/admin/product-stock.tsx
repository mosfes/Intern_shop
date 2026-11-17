"use client";

import { useState } from "react";
import { MinusIcon, PlusIcon } from "@/components/icons";
import { MAX_PRODUCT_STOCK } from "@/lib/product-management";
import type { Product } from "@/lib/types";

export type StockFeedback = { id: string; message: string; error?: boolean };

export function ProductStock({ product, disabled, saving, feedback, onSave }: {
  product: Product;
  disabled: boolean;
  saving: boolean;
  feedback?: StockFeedback | null;
  onSave: (stock: number) => Promise<void>;
}) {
  const [value, setValue] = useState(String(product.stock));
  const quantity = value.trim() ? Number(value) : NaN;
  const valid = Number.isInteger(quantity) && quantity >= 0 && quantity <= MAX_PRODUCT_STOCK;
  const changed = value !== String(product.stock);
  const stepButton = "grid size-9 shrink-0 place-items-center text-muted hover:bg-accent-soft hover:text-accent focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40";

  return <form className="w-40 space-y-2" aria-label={`แก้ไขสต็อก ${product.name}`} aria-busy={saving} onSubmit={(event) => {
    event.preventDefault();
    if (valid && changed && !disabled) void onSave(quantity);
  }}>
    <div className="flex items-center overflow-hidden rounded-lg border border-[var(--field-border)] bg-[var(--field-background)] focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15">
      <button type="button" disabled={disabled || !valid || quantity <= 0} aria-label={`ลดสต็อก ${product.name} 1 ชิ้น`} onClick={() => setValue(String(quantity - 1))} className={stepButton}><MinusIcon size={15} /></button>
      <input type="number" inputMode="numeric" min={0} max={MAX_PRODUCT_STOCK} step={1} required value={value} disabled={disabled} onChange={(event) => setValue(event.target.value)} onFocus={(event) => event.target.select()} onKeyDown={(event) => { if (event.key === "Escape" && !disabled) { event.preventDefault(); setValue(String(product.stock)); } }} aria-label={`จำนวนสต็อก ${product.name} (ชิ้น)`} className="h-9 min-w-0 flex-1 appearance-textfield bg-transparent text-center text-sm tabular-nums outline-none disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
      <button type="button" disabled={disabled || (value !== "" && (!valid || quantity >= MAX_PRODUCT_STOCK))} aria-label={`เพิ่มสต็อก ${product.name} 1 ชิ้น`} onClick={() => setValue(String((value === "" ? 0 : quantity) + 1))} className={stepButton}><PlusIcon size={15} /></button>
    </div>
    {changed && <div className="flex items-center gap-3">
      <button type="submit" disabled={disabled || !valid} className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50">{saving ? "กำลังบันทึก…" : "บันทึก"}</button>
      <button type="button" disabled={disabled} onClick={() => setValue(String(product.stock))} className="text-xs text-muted hover:text-foreground disabled:opacity-50">ยกเลิก</button>
    </div>}
    {feedback && <p role={feedback.error ? "alert" : "status"} className={`whitespace-normal text-xs ${feedback.error ? "text-danger" : "text-success"}`}>{feedback.message}</p>}
  </form>;
}
