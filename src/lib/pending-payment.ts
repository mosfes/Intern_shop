import type { Order } from "./types";

const KEY = "edm-pending-payment";

/** The order a customer is paying for, kept across the redirect to their bank and back. */
export type PendingPayment = { chargeId: string; order: Order };

export function savePendingPayment(pending: PendingPayment) {
  try { localStorage.setItem(KEY, JSON.stringify(pending)); } catch { /* private mode: the redirect flow just can't resume */ }
}

export function loadPendingPayment(): PendingPayment | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return value && typeof value.chargeId === "string" && value.order && Array.isArray(value.order.lines) ? value : null;
  } catch { return null; }
}

export function clearPendingPayment() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/** A stable order number from the charge id, so settling the same payment twice can't create two orders. */
export const orderIdForCharge = (chargeId: string) => `CB${chargeId.replace(/[^A-Za-z0-9]/g, "").slice(-8).toUpperCase()}`;
