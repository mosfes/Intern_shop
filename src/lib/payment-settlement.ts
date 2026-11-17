import type { OmiseCharge } from "./omise";
import { orderIdForCharge } from "./pending-payment";
import { prisma } from "./prisma";
import type { Order } from "./types";
import { enqueueOrderEmail, sendOrderEmail } from "./order-email";
import { adjustDatabaseStock, finishStockAdjustment, type StockLine } from "./stock";

/** Only call with a charge fetched directly from Omise, never the webhook body. */
export async function settleCharge(charge: OmiseCharge) {
  let emailId: string | undefined;
  let stockTaken: StockLine[] | undefined;
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.checkoutPayment.findFirst({
      where: { OR: [
        { chargeId: charge.id },
        ...(charge.metadata?.checkoutId ? [{ id: charge.metadata.checkoutId }] : []),
      ] },
    });
    if (!payment) return null; // Payments made before server-side checkout snapshots.
    if (payment.userId !== charge.metadata?.userId || payment.amount !== charge.amount || charge.currency.toUpperCase() !== "THB" || (payment.chargeId && payment.chargeId !== charge.id)) {
      throw new Error("Payment does not match the saved checkout");
    }
    const order = { ...(payment.order as unknown as Order), id: orderIdForCharge(charge.id) };
    // A delayed event cannot undo an already confirmed order.
    if (payment.status === "successful") return order;
    const status = charge.status === "successful" && charge.paid ? "successful"
      : ["failed", "expired", "reversed"].includes(charge.status) ? "failed" : "pending";
    // A terminal failure is not made pending again by a delayed create event.
    if (payment.status === "failed" && status === "pending") return null;
    const updated = await tx.checkoutPayment.updateMany({ where: {
      id: payment.id, status: status === "pending" ? "pending" : { not: "successful" },
    }, data: {
      chargeId: charge.id, status, order: JSON.parse(JSON.stringify(status === "successful" ? { ...order, stockTaken: true } : order)),
    } });
    if (status !== "successful") return null;
    if (!updated.count) return order;

    // Only the update that moved this payment to successful gets here, so stock is taken exactly once per order,
    // in the same transaction as the payment itself. MockAPI products are handled after the commit.
    stockTaken = await adjustDatabaseStock(tx, order.lines, "take");

    const recorded = await tx.paymentCharge.createMany({
      data: [{ chargeId: charge.id, userId: payment.userId, amount: charge.amount, discountCode: order.discountCode ?? null }],
      skipDuplicates: true,
    });
    if (recorded.count === 1) {
      if (order.discountCode) {
        // Record actual paid usage, even if the coupon expired while the bank was authorising.
        await tx.discountCode.updateMany({ where: { code: order.discountCode }, data: { usedCount: { increment: 1 } } });
      }
      await tx.cartItem.deleteMany({ where: { userId: payment.userId, productId: { in: order.lines.map((line) => line.productId) } } });
      if (process.env.RESEND_API_KEY && process.env.RESEND_FROM) {
        emailId = `paid/${payment.id}`;
        await enqueueOrderEmail(tx, emailId, payment.userId, order, "paid", charge.id);
      }
    }
    return order;
  });
  if (stockTaken) await finishStockAdjustment(stockTaken, "take");
  if (emailId) await sendOrderEmail(emailId).catch(() => false);
  return result;
}
