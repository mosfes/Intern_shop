import { Prisma } from "@/generated/prisma/client";
import { prisma } from "./prisma";
import { PaymentError } from "./payments";

// All writers use the same database locks, including workers on other server instances.
export const stockTransactionOptions = { timeout: 60_000, maxWait: 10_000, isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted };

export const stockTransaction = <T>(work: (tx: Prisma.TransactionClient) => Promise<T>) => prisma.$transaction(work, stockTransactionOptions);

export async function lockStock(tx: Prisma.TransactionClient, productIds: readonly string[]) {
  const ids = [...new Set(productIds)].sort();
  if (!ids.length) return;
  // Sorted insertion and acquisition give multi-product checkouts a consistent lock order.
  for (const productId of ids) {
    // INSERT IGNORE can take shared duplicate-key locks and deadlock when two callers upgrade them.
    await tx.$executeRaw`INSERT INTO StockLock (productId) VALUES (${productId}) ON DUPLICATE KEY UPDATE productId = VALUES(productId)`;
    await tx.$queryRaw`SELECT productId FROM StockLock WHERE productId = ${productId} FOR UPDATE`;
  }
}

export async function heldQuantity(tx: Prisma.TransactionClient, productId: string) {
  const held = await tx.stockReservation.aggregate({ where: { productId, state: "held" }, _sum: { quantity: true } });
  return held._sum.quantity ?? 0;
}

export async function checkStockEdit(tx: Prisma.TransactionClient, productId: string, stock?: number) {
  const pending = await tx.stockMovement.count({ where: { productId, state: { not: "applied" } } });
  if (pending) throw new PaymentError("สินค้านี้กำลังรอปรับสต็อก กรุณาลองอีกครั้งภายหลัง", 409);
  const held = await heldQuantity(tx, productId);
  if (held > (stock ?? 0)) throw new PaymentError(`สินค้านี้มีการจอง ${held} ชิ้น กรุณารอให้ชำระเงินเสร็จก่อนปรับสต็อกหรือลบสินค้า`, 409);
}

export class StockConflictError extends Error {
  constructor(public stock: number) { super("Stock changed"); }
}

/** Raised only during the preflight, before any stock/reservation writes. */
export class StockUnavailableError extends PaymentError {
  constructor(message = "สินค้าไม่พอสำหรับคำสั่งซื้อนี้ กรุณาติดต่อร้านค้า") { super(message, 409); }
}
