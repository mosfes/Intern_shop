import { createCharge, OmiseError } from "./omise";
import { releaseCheckoutStock, reserveCheckoutStock } from "./stock";
import { stockTransaction } from "./stock-coordination";
import { toSatang } from "./payments";
import type { Order } from "./types";

/** Reserve before the bank can charge; retain an uncertain bank create for reconciliation. */
export async function startCheckoutPayment(userId: string, order: Order, params: Record<string, string>) {
  await stockTransaction(async (tx) => {
    await tx.checkoutPayment.create({ data: {
      id: order.id, userId, amount: toSatang(order.total), order: JSON.parse(JSON.stringify(order)),
    } });
    await reserveCheckoutStock(tx, order.id, order.lines);
  });
  let charge;
  try { charge = await createCharge(params); }
  catch (error) {
    if (error instanceof OmiseError && error.status === 400) await stockTransaction(async (tx) => {
      const changed = await tx.checkoutPayment.updateMany({ where: { id: order.id, status: "pending", chargeId: null }, data: { status: "failed" } });
      if (changed.count) await releaseCheckoutStock(tx, order.id);
    });
    throw error;
  }
  // A webhook can already have linked and settled this charge. Never overwrite its result.
  await stockTransaction((tx) => tx.checkoutPayment.updateMany({ where: { id: order.id, chargeId: null }, data: { chargeId: charge.id } }));
  return charge;
}
