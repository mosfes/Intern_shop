export type DiscountType = "PERCENT" | "FIXED";

export type DiscountCode = {
  code: string;
  type: DiscountType;
  /** PERCENT: 1–100. FIXED: baht off. */
  value: number;
  minSubtotal: number;
  /** Cap on a PERCENT discount, in baht. */
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  /** Last valid day as YYYY-MM-DD (Thailand time), or null for no expiry. */
  expiresAt: string | null;
  active: boolean;
};

export type DiscountCodeInput = Omit<DiscountCode, "usedCount">;

export class DiscountCodeError extends Error { constructor(message: string, public status = 400) { super(message); } }

export const CODE_PATTERN = /^[A-Z0-9_-]{3,30}$/;
export const normalizeCode = (value: unknown) => (typeof value === "string" ? value.trim().toUpperCase() : "");

const THAI_OFFSET_MS = 7 * 60 * 60 * 1000;
/** A code stays valid through the whole of its last day, Thailand time. */
export const expiryInstant = (day: string) => new Date(`${day}T23:59:59.999+07:00`);
export const expiryDay = (instant: Date) => new Date(instant.getTime() + THAI_OFFSET_MS).toISOString().slice(0, 10);

type Row = { code: string; type: string; value: number; minSubtotal: number; maxDiscount: number | null; usageLimit: number | null; usedCount: number; expiresAt: Date | null; active: boolean };
export const toDiscountCode = (row: Row): DiscountCode => ({
  code: row.code, type: row.type === "PERCENT" ? "PERCENT" : "FIXED", value: row.value, minSubtotal: row.minSubtotal,
  maxDiscount: row.maxDiscount, usageLimit: row.usageLimit, usedCount: row.usedCount,
  expiresAt: row.expiresAt ? expiryDay(row.expiresAt) : null, active: row.active,
});

/** Validates an admin form body. Numbers may arrive as strings from form inputs; blank optional fields mean "no limit". */
export function validateDiscountInput(body: Record<string, unknown>): DiscountCodeInput {
  const code = normalizeCode(body.code);
  if (!CODE_PATTERN.test(code)) throw new DiscountCodeError("โค้ดต้องเป็น A-Z ตัวเลข ขีดกลาง หรือขีดล่าง ยาว 3–30 ตัวอักษร");
  const type = body.type;
  if (type !== "PERCENT" && type !== "FIXED") throw new DiscountCodeError("กรุณาเลือกประเภทส่วนลด");
  function int(key: string, label: string, min: number, max: number, optional = false) {
    const raw = body[key];
    if (optional && (raw === null || raw === undefined || raw === "")) return null;
    const value = typeof raw === "number" ? raw : typeof raw === "string" && /^\d+$/.test(raw.trim()) ? Number(raw.trim()) : NaN;
    if (!Number.isInteger(value) || value < min || value > max) throw new DiscountCodeError(`${label}ต้องเป็นจำนวนเต็ม ${min.toLocaleString("en-US")}–${max.toLocaleString("en-US")}`);
    return value;
  }
  const value = type === "PERCENT" ? int("value", "เปอร์เซ็นต์ส่วนลด", 1, 100)! : int("value", "จำนวนเงินส่วนลด", 1, 1_000_000)!;
  const minSubtotal = int("minSubtotal", "ยอดซื้อขั้นต่ำ", 0, 10_000_000, true) ?? 0;
  if (type === "FIXED" && minSubtotal > 0 && value > minSubtotal) throw new DiscountCodeError("ส่วนลดต้องไม่มากกว่ายอดซื้อขั้นต่ำ");
  const maxDiscount = type === "PERCENT" ? int("maxDiscount", "ส่วนลดสูงสุด", 1, 1_000_000, true) : null;
  const usageLimit = int("usageLimit", "จำนวนครั้งที่ใช้ได้", 1, 1_000_000, true);
  let expiresAt: string | null = null;
  if (body.expiresAt !== null && body.expiresAt !== undefined && body.expiresAt !== "") {
    if (typeof body.expiresAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.expiresAt) || Number.isNaN(expiryInstant(body.expiresAt).getTime())) throw new DiscountCodeError("วันหมดอายุไม่ถูกต้อง");
    expiresAt = body.expiresAt;
  }
  return { code, type, value, minSubtotal, maxDiscount, usageLimit, expiresAt, active: body.active !== false };
}

/** Baht taken off the subtotal (never more than the subtotal). Assumes the code is already valid for it. */
export function computeDiscount(code: Pick<DiscountCode, "type" | "value" | "maxDiscount">, subtotal: number) {
  const raw = code.type === "PERCENT" ? Math.floor((subtotal * code.value) / 100) : code.value;
  const capped = code.type === "PERCENT" && code.maxDiscount !== null ? Math.min(raw, code.maxDiscount) : raw;
  return Math.max(0, Math.min(capped, subtotal));
}

/** Throws a customer-facing error if the code can't be used for this subtotal; otherwise returns the discount. */
export function applyDiscountCode(code: DiscountCode | null, subtotal: number, now = new Date()) {
  if (!code || !code.active) throw new DiscountCodeError("ไม่พบโค้ดส่วนลดนี้", 404);
  if (code.expiresAt && now > expiryInstant(code.expiresAt)) throw new DiscountCodeError("โค้ดนี้หมดอายุแล้ว", 410);
  if (code.usageLimit !== null && code.usedCount >= code.usageLimit) throw new DiscountCodeError("โค้ดนี้ถูกใช้ครบจำนวนแล้ว", 410);
  if (subtotal < code.minSubtotal) throw new DiscountCodeError(`ซื้อขั้นต่ำ ฿${code.minSubtotal.toLocaleString("en-US")} จึงจะใช้โค้ดนี้ได้`, 422);
  const discount = computeDiscount(code, subtotal);
  if (discount <= 0) throw new DiscountCodeError("โค้ดนี้ใช้กับยอดสั่งซื้อนี้ไม่ได้", 422);
  return discount;
}

export function describeDiscount(code: Pick<DiscountCode, "type" | "value" | "maxDiscount">) {
  if (code.type === "FIXED") return `ลด ฿${code.value.toLocaleString("en-US")}`;
  return `ลด ${code.value}%${code.maxDiscount !== null ? ` (สูงสุด ฿${code.maxDiscount.toLocaleString("en-US")})` : ""}`;
}
