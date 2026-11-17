import { prisma } from "./prisma";
import { getCharge } from "./omise";
import { settleCharge } from "./payment-settlement";
import { retryStockMovements } from "./stock";

/** A missed webhook must not leave bank-expired reservations held forever. */
export async function maintainStock() {
  const payments = await prisma.checkoutPayment.findMany({
    where: { chargeId: { not: null }, OR: [{ status: "pending" }, { status: "successful", order: { path: "$.stockIssue", string_contains: "" } }] }, orderBy: { updatedAt: "asc" }, take: 20,
    select: { id: true, chargeId: true },
  });
  let reconciled = 0;
  for (const payment of payments) {
    try { await settleCharge(await getCharge(payment.chargeId!)); reconciled++; }
    catch { console.error("Stock payment reconciliation failed", { checkoutId: payment.id }); }
  }
  const movements = await retryStockMovements();
  const unlinked = await prisma.checkoutPayment.count({ where: { status: "pending", chargeId: null, createdAt: { lt: new Date(Date.now() - 10 * 60_000) } } });
  // An uncertain bank create can still succeed. Never expire these by wall clock; review provider records first.
  if (unlinked) console.error("Unlinked checkouts require payment-provider review before releasing reservations", { count: unlinked });
  return { reconciled, ...movements, unlinked };
}
