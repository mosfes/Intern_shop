import { withFlashSalePrice } from "./flash-sale";
import { applyDiscountCode, type DiscountCode } from "./discount-codes";
import { MAX_CART_LINES, MAX_LINE_QUANTITY } from "./cart-limits";
import { shippingCost, shippingOptions, type ShippingId } from "./format";
import type { Product } from "./types";

/** Thai mobile banking apps Omise can open for payment. */
export const MOBILE_BANKS = [
  { id: "mobile_banking_kbank", label: "K PLUS (กสิกรไทย)" },
  { id: "mobile_banking_scb", label: "SCB Easy (ไทยพาณิชย์)" },
  { id: "mobile_banking_bay", label: "KMA (กรุงศรี)" },
  { id: "mobile_banking_bbl", label: "Bualuang mBanking (กรุงเทพ)" },
  { id: "mobile_banking_ktb", label: "Krungthai NEXT (กรุงไทย)" },
] as const;

export type PaymentMethod = "card" | "promptpay" | (typeof MOBILE_BANKS)[number]["id"];
export const isPaymentMethod = (value: unknown): value is PaymentMethod =>
  value === "card" || value === "promptpay" || MOBILE_BANKS.some((bank) => bank.id === value);

export const paymentLabel = (method: PaymentMethod) =>
  method === "card" ? "บัตรเครดิต / เดบิต" : method === "promptpay" ? "พร้อมเพย์ QR" : `Mobile Banking · ${MOBILE_BANKS.find((bank) => bank.id === method)!.label}`;

/** Omise's lowest chargeable amount for PromptPay and mobile banking (THB 20). */
export const MIN_CHARGE_BAHT = 20;
export const toSatang = (baht: number) => Math.round(baht * 100);

export class PaymentError extends Error { constructor(message: string, public status = 400) { super(message); } }

export type PricedOrder = { subtotal: number; discount: number; shipping: number; total: number };

/**
 * The amount to charge, worked out from the catalogue (never from prices sent by the browser).
 * `lines` is untrusted input from the request body.
 */
export function priceOrder(lines: unknown, productMap: Map<string, Product>, shipping: unknown, code: DiscountCode | null, now = new Date()): PricedOrder {
  if (!Array.isArray(lines) || lines.length === 0 || lines.length > MAX_CART_LINES) throw new PaymentError("ไม่มีสินค้าสำหรับชำระเงิน");
  if (!shippingOptions.some((option) => option.id === shipping)) throw new PaymentError("กรุณาเลือกวิธีการจัดส่ง");
  const seen = new Set<string>();
  let subtotal = 0;
  for (const line of lines) {
    const productId = line && typeof line === "object" ? (line as Record<string, unknown>).productId : null;
    const quantity = line && typeof line === "object" ? (line as Record<string, unknown>).quantity : null;
    if (typeof productId !== "string" || seen.has(productId) || !Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > MAX_LINE_QUANTITY) throw new PaymentError("รายการสินค้าไม่ถูกต้อง");
    seen.add(productId);
    const product = productMap.get(productId);
    if (!product) throw new PaymentError("มีสินค้าในตะกร้าที่ไม่มีจำหน่ายแล้ว กรุณากลับไปตรวจสอบตะกร้า", 409);
    if (product.stock < (quantity as number)) throw new PaymentError(`${product.name} มีสินค้าไม่พอ (เหลือ ${Math.max(0, product.stock)} ชิ้น)`, 409);
    subtotal += withFlashSalePrice(product, now.getTime()).price * (quantity as number);
  }
  const discount = code ? applyDiscountCode(code, subtotal, now) : 0;
  const ship = shippingCost(shipping as ShippingId, subtotal);
  const total = subtotal - discount + ship;
  if (total < MIN_CHARGE_BAHT) throw new PaymentError(`ยอดชำระขั้นต่ำ ฿${MIN_CHARGE_BAHT}`);
  return { subtotal, discount, shipping: ship, total };
}
