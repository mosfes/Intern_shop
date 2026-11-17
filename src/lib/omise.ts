const API = "https://api.omise.co";

export type OmiseCharge = {
  id: string;
  /** pending | successful | failed | expired | reversed */
  status: string;
  paid: boolean;
  amount: number;
  currency: string;
  authorize_uri: string | null;
  failure_code: string | null;
  failure_message: string | null;
  expires_at: string | null;
  metadata?: Record<string, string>;
  source?: { scannable_code?: { image?: { download_uri?: string } } } | null;
};

export class OmiseError extends Error { constructor(message: string, public status = 502, public omiseCode = "") { super(message); } }

export const omiseConfigured = () => !!process.env.OMISE_SECRET_KEY;

async function request<T>(method: "GET" | "POST", path: string, form?: Record<string, string>): Promise<T> {
  const key = process.env.OMISE_SECRET_KEY;
  if (!key) throw new OmiseError("ระบบชำระเงินยังไม่เปิดใช้งาน", 503);
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      method,
      headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`, ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
      body: form ? new URLSearchParams(form) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch { throw new OmiseError("เชื่อมต่อระบบชำระเงินไม่สำเร็จ กรุณาลองอีกครั้ง", 503); }
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.object === "error") {
    // Card errors (declined, bad number) are the customer's to fix; anything else is ours.
    const code = typeof body?.code === "string" ? body.code : "";
    const message = typeof body?.message === "string" ? body.message : "";
    throw new OmiseError(message || "ชำระเงินไม่สำเร็จ กรุณาลองอีกครั้ง", response.status === 404 ? 404 : response.status >= 500 ? 503 : 400, code);
  }
  return body as T;
}

export const createCharge = (params: Record<string, string>) => request<OmiseCharge>("POST", "/charges", params);
export const getCharge = (id: string) => request<OmiseCharge>("GET", `/charges/${encodeURIComponent(id)}`);

const FAILURES: Record<string, string> = {
  insufficient_fund: "วงเงินหรือยอดเงินไม่เพียงพอ",
  stolen_or_lost_card: "บัตรนี้ใช้ชำระเงินไม่ได้ กรุณาติดต่อธนาคารผู้ออกบัตร",
  invalid_security_code: "รหัส CVV ไม่ถูกต้อง",
  failed_fraud_check: "ระบบตรวจสอบความปลอดภัยไม่อนุมัติรายการนี้",
  payment_expired: "รายการชำระเงินหมดอายุแล้ว",
  payment_cancelled: "ยกเลิกการชำระเงินแล้ว",
};
/** A Thai, customer-safe reason for a failed or expired charge. */
export function failureReason(charge: Pick<OmiseCharge, "status" | "failure_code">) {
  if (charge.status === "expired") return FAILURES.payment_expired;
  return (charge.failure_code && FAILURES[charge.failure_code]) || "ธนาคารไม่อนุมัติการชำระเงิน กรุณาลองบัตรหรือวิธีชำระเงินอื่น";
}
