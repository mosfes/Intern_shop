import type { OmiseCharge } from "./omise";
import { orderIdForCharge } from "./pending-payment";
import type { Order } from "./types";
import { enqueueOrderEmail, sendOrderEmail } from "./order-email";
import { adjustDatabaseStock, finishStockAdjustment, releaseCheckoutStock, type StockLine } from "./stock";
import { StockUnavailableError, stockTransaction } from "./stock-coordination";
import { isTiDBProduct } from "./admin-products";

/** Only call with a charge fetched directly from Omise, never the webhook body. */
export async function settleCharge(charge: OmiseCharge) {
  let emailId: string | undefined;
  let stockTaken: StockLine[] | undefined;
  const result = await stockTransaction(async (tx) => {
    const matched = await tx.checkoutPayment.findFirst({
      where: { OR: [
        { chargeId: charge.id },
        ...(charge.metadata?.checkoutId ? [{ id: charge.metadata.checkoutId }] : []),
      ] },
    });
    if (!matched) return null; // Payments made before server-side checkout snapshots.
    await tx.$queryRaw`SELECT id FROM CheckoutPayment WHERE id = ${matched.id} FOR UPDATE`;
    const payment = await tx.checkoutPayment.findFirst({ where: { id: matched.id } });
    if (!payment) return null;
    if (payment.userId !== charge.metadata?.userId || payment.amount !== charge.amount || charge.currency.toUpperCase() !== "THB" || (payment.chargeId && payment.chargeId !== charge.id)) {
      throw new Error("Payment does not match the saved checkout");
    }
    const order = { ...(payment.order as unknown as Order), id: orderIdForCharge(charge.id) };
    // A delayed event cannot undo an already confirmed order.
    if (payment.status === "successful") {
      stockTaken = order.lines.filter((line) => !isTiDBProduct(line.productId));
      if (order.stockIssue && order.status !== "cancelled") {
        try {
          stockTaken = await adjustDatabaseStock(tx, order.lines, "take", payment.id);
          order.stockTaken = true;
          delete order.stockIssue;
          await tx.checkoutPayment.updateMany({ where: { id: payment.id, status: "successful" }, data: { order: JSON.parse(JSON.stringify(order)) } });
        } catch (error) { if (!(error instanceof StockUnavailableError)) throw error; }
      }
      return order;
    }
    const status = charge.status === "successful" && charge.paid ? "successful"
      : ["failed", "expired", "reversed"].includes(charge.status) ? "failed" : "pending";
    // A terminal failure is not made pending again by a delayed create event.
    if (payment.status === "failed" && status === "pending") return null;
    const updated = await tx.checkoutPayment.updateMany({ where: {
      id: payment.id, status: status === "pending" ? "pending" : { not: "successful" },
    }, data: {
      chargeId: charge.id, status, order: JSON.parse(JSON.stringify(status === "successful" ? { ...order, stockTaken: true } : order)),
    } });
    if (status !== "successful") {
      if (updated.count && status === "failed") await releaseCheckoutStock(tx, payment.id);
      return null;
    }
    if (!updated.count) return order;

    // Only the update that moved this payment to successful gets here, so stock is taken exactly once per order,
    // in the same transaction as the payment itself. MockAPI products are handled after the commit.
    try {
      stockTaken = await adjustDatabaseStock(tx, order.lines, "take", payment.id);
      order.stockTaken = true;
    } catch (error) {
      if (!(error instanceof StockUnavailableError)) throw error;
      // A legacy checkout can already be paid without having reserved. Keep the payment visible for admin review.
      order.stockTaken = false;
      order.stockIssue = error.message;
      await tx.checkoutPayment.updateMany({ where: { id: payment.id, status: "successful" }, data: { order: JSON.parse(JSON.stringify(order)) } });
    }

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
  if (stockTaken) await finishStockAdjustment(stockTaken);
  if (emailId) await sendOrderEmail(emailId).catch(() => false);
  return result;
}
