import { type NextRequest, NextResponse } from "next/server";
import { customerFromRequest } from "@/lib/customer-session";
import { getCharge } from "@/lib/omise";
import { settleCharge } from "@/lib/payment-settlement";
import { prisma } from "@/lib/prisma";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: NextRequest) {
  try {
    const user = await customerFromRequest(request);
    if (!user?.googleId) return json({ error: "กรุณาเข้าสู่ระบบ" }, 401);
    // Reconcile recent pending payments when returning, in case a webhook delivery was missed.
    const pending = await prisma.checkoutPayment.findMany({ where: { userId: user.googleId, status: "pending", chargeId: { not: null } }, orderBy: { createdAt: "desc" }, take: 5 });
    await Promise.allSettled(pending.map(async (payment) => settleCharge(await getCharge(payment.chargeId!))));
    const paid = await prisma.checkoutPayment.findMany({ where: { userId: user.googleId, status: "successful" }, orderBy: { createdAt: "desc" } });
    return json({ orders: paid.map((payment) => payment.order) });
  } catch { return json({ error: "โหลดคำสั่งซื้อไม่สำเร็จ" }, 503); }
}
