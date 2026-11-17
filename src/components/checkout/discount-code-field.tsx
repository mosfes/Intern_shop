"use client";

import { useState } from "react";
import { CheckIcon } from "@/components/icons";
import { formatBaht } from "@/lib/format";

type Applied = { code: string; discount: number; subtotal: number };

async function call(code: string, subtotal: number): Promise<{ ok: true; code: string; discount: number } | { ok: false; error: string }> {
  try {
    const response = await fetch("/api/discount-codes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, subtotal }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, error: typeof result.error === "string" ? result.error : "ตรวจสอบโค้ดไม่สำเร็จ กรุณาลองอีกครั้ง" };
    return { ok: true, code: result.code, discount: result.discount };
  } catch { return { ok: false, error: "เชื่อมต่อไม่สำเร็จ กรุณาลองอีกครั้ง" }; }
}

export function DiscountCodeField({ subtotal, applied, error, disabled, onApply, onRemove, onError }: {
  subtotal: number;
  applied: Applied | null;
  error: string;
  disabled: boolean;
  onApply: (applied: Applied) => void;
  onRemove: () => void;
  onError: (message: string) => void;
}) {
  const [value, setValue] = useState("");
  const [checking, setChecking] = useState(false);

  async function apply() {
    const code = value.trim();
    if (!code || checking) return;
    setChecking(true);
    const result = await call(code, subtotal);
    setChecking(false);
    if (result.ok) { onApply({ code: result.code, discount: result.discount, subtotal }); setValue(""); }
    else onError(result.error);
  }

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl bg-success/10 px-3 py-2.5 text-sm">
        <span className="flex min-w-0 items-center gap-2 text-success">
          <CheckIcon size={16} className="shrink-0" />
          <span className="min-w-0 truncate">ใช้โค้ด <strong className="font-mono">{applied.code}</strong> ลด {formatBaht(applied.discount)}</span>
        </span>
        <button type="button" disabled={disabled} onClick={onRemove} className="shrink-0 text-xs text-muted underline hover:text-foreground disabled:opacity-50">เอาออก</button>
      </div>
    );
  }
  return (
    <div>
      <label htmlFor="discount-code" className="mb-1.5 block text-sm font-medium">โค้ดส่วนลด</label>
      <div className="flex gap-2">
        <input
          id="discount-code"
          value={value}
          disabled={disabled || checking}
          maxLength={30}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="กรอกโค้ดส่วนลด"
          aria-invalid={!!error}
          aria-describedby={error ? "discount-code-error" : undefined}
          onChange={(event) => { setValue(event.target.value.toUpperCase()); if (error) onError(""); }}
          // Enter applies the code instead of submitting the whole checkout form.
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void apply(); } }}
          className="min-h-10 min-w-0 flex-1 rounded-lg border border-[var(--field-border)] bg-[var(--field-background)] px-3 py-2 font-mono text-sm uppercase outline-none placeholder:font-sans placeholder:normal-case focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:opacity-50"
        />
        <button type="button" disabled={disabled || checking || !value.trim()} onClick={() => void apply()} className="shrink-0 rounded-lg border border-border px-4 text-sm font-medium text-accent hover:bg-accent-soft disabled:opacity-50">
          {checking ? "กำลังตรวจ…" : "ใช้โค้ด"}
        </button>
      </div>
      {error && <p id="discount-code-error" role="alert" className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}
