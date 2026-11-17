import { type NextRequest, NextResponse } from "next/server";
import { customerFromRequest } from "@/lib/customer-session";
import { settleCharge } from "@/lib/payment-settlement";
import { failureReason, getCharge, OmiseError, omiseConfigured } from "@/lib/omise";
import { prisma } from "@/lib/prisma";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
type Context = { params: Promise<{ id: string }> };

/**
 * Status of one of the signed-in customer's payments, straight from Omise (the browser is never trusted for it).
 * The first time a charge is seen as successful it is settled: recorded once, and its discount code counted once.
 */
export async function GET(request: NextRequest, { params }: Context) {
  try {
    const user = await customerFromRequest(request);
    if (!user?.googleId) return json({ error: "กรุณาเข้าสู่ระบบ" }, 401);
    if (!omiseConfigured()) return json({ error: "ระบบชำระเงินยังไม่เปิดใช้งาน" }, 503);
    const { id } = await params;
    if (!/^chrg_[A-Za-z0-9_]+$/.test(id)) return json({ error: "ไม่พบรายการชำระเงิน" }, 404);
    const charge = await getCharge(id);
    // Someone else's charge looks the same as one that doesn't exist.
    if (charge.metadata?.userId !== user.googleId) return json({ error: "ไม่พบรายการชำระเงิน" }, 404);

    const total = charge.amount / 100;
    const order = await settleCharge(charge);
    if (charge.status === "successful" && charge.paid) {
      const discountCode = charge.metadata?.discountCode || null;
      // Legacy checkouts have no server snapshot; retain their payment ledger.
      if (!order) await prisma.$transaction(async (tx) => {
        const inserted = await tx.paymentCharge.createMany({ data: [{ chargeId: charge.id, userId: user.googleId, amount: charge.amount, discountCode }], skipDuplicates: true });
        if (inserted.count && discountCode) await tx.discountCode.updateMany({ where: { code: discountCode }, data: { usedCount: { increment: 1 } } });
      });
      return json({ status: "successful", total, discountCode, order });
    }
    if (charge.status === "pending") {
      return json({ status: "pending", total, authorizeUri: charge.authorize_uri, expiresAt: charge.expires_at, qrUrl: charge.source?.scannable_code?.image?.download_uri ?? null });
    }
    return json({ status: "failed", total, error: failureReason(charge) });
  } catch (error) {
    if (error instanceof OmiseError) return json({ error: error.message }, error.status);
    return json({ error: "ตรวจสอบการชำระเงินไม่สำเร็จ กรุณาลองอีกครั้ง" }, 503);
  }
}
