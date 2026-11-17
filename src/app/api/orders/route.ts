import { type NextRequest, NextResponse } from "next/server";
import { customerOrder } from "@/lib/admin-orders";
import { customerFromRequest } from "@/lib/customer-session";
import { getCharge } from "@/lib/omise";
import { settleCharge } from "@/lib/payment-settlement";
import { prisma } from "@/lib/prisma";
import type { Order } from "@/lib/types";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: NextRequest) {
  try {
    const user = await customerFromRequest(request);
    if (!user?.googleId) return json({ error: "กรุณาเข้าสู่ระบบ" }, 401);
    // Reconcile recent pending payments when returning, in case a webhook delivery was missed.
    const pending = await prisma.checkoutPayment.findMany({ where: { userId: user.googleId, status: "pending", chargeId: { not: null } }, orderBy: { createdAt: "desc" }, take: 5 });
    await Promise.allSettled(pending.map(async (payment) => settleCharge(await getCharge(payment.chargeId!))));
    const payments = await prisma.checkoutPayment.findMany({ where: { userId: user.googleId, OR: [{ status: "successful" }, { status: "pending", chargeId: { not: null } }] }, orderBy: { createdAt: "desc" } });
    return json({ orders: payments.map((payment) => ({ ...customerOrder(payment.order as unknown as Order), paymentStatus: payment.status === "pending" ? "pending" : "successful", ...(payment.status === "pending" && payment.chargeId ? { chargeId: payment.chargeId } : {}) })) });
  } catch { return json({ error: "โหลดคำสั่งซื้อไม่สำเร็จ" }, 503); }
}
