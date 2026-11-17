import { type NextRequest, NextResponse } from "next/server";
import { applyDiscountCode, DiscountCodeError, normalizeCode } from "@/lib/discount-codes";
import { findDiscountCode } from "@/lib/discount-codes-server";
import { customerFromRequest } from "@/lib/customer-session";
import { authConfig } from "@/lib/google-auth";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Previews a discount code for the signed-in customer's subtotal: { code, subtotal } → { code, discount }.
 * The code is only counted as used once the payment succeeds (see /api/payments/[id]); the amount actually
 * charged is always recomputed on the server in /api/payments/charge.
 */
export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== authConfig().origin) return json({ error: "คำขอไม่ถูกต้อง" }, 403);
    const user = await customerFromRequest(request);
    if (!user) return json({ error: "กรุณาเข้าสู่ระบบ" }, 401);
    let body: Record<string, unknown>;
    try { body = await request.json(); } catch { return json({ error: "ข้อมูลไม่ถูกต้อง" }, 400); }
    const code = normalizeCode(body?.code);
    const subtotal = body?.subtotal;
    if (!code || typeof subtotal !== "number" || !Number.isFinite(subtotal) || subtotal < 0) return json({ error: "กรุณากรอกโค้ดส่วนลด" }, 400);
    return json({ code, discount: applyDiscountCode(await findDiscountCode(code), subtotal) });
  } catch (error) {
    if (error instanceof DiscountCodeError) return json({ error: error.message }, error.status);
    return json({ error: "ตรวจสอบโค้ดไม่สำเร็จ กรุณาลองอีกครั้ง" }, 503);
  }
}
