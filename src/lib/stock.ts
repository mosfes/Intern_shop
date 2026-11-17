import { randomUUID } from "node:crypto";
import { revalidateTag } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { catalogRequest, isTiDBProduct } from "./admin-products";
import { CATALOG_TAG } from "./catalog-server";
import { heldQuantity, lockStock, StockUnavailableError, stockTransaction } from "./stock-coordination";
import { PaymentError } from "./payments";
import type { OrderLine, Product } from "./types";

export type StockLine = Pick<OrderLine, "productId" | "quantity">;
export type StockDirection = "take" | "return";
type RemoteProduct = Product & { stockOperationId?: string };

function validLines(lines: readonly Partial<StockLine>[]): StockLine[] {
  const combined = new Map<string, number>();
  for (const line of lines) {
    if (typeof line.productId !== "string" || !Number.isSafeInteger(line.quantity) || line.quantity! <= 0) continue;
    combined.set(line.productId, (combined.get(line.productId) ?? 0) + line.quantity!);
  }
  return [...combined].map(([productId, quantity]) => ({ productId, quantity })).sort((a, b) => a.productId.localeCompare(b.productId));
}

async function productStock(tx: Prisma.TransactionClient, productId: string) {
  const product = isTiDBProduct(productId)
    ? await tx.product.findUnique({ where: { id: productId }, select: { stock: true } })
    : await catalogRequest<RemoteProduct>(`products/${encodeURIComponent(productId)}`);
  if (!product) throw new StockUnavailableError();
  if (!Number.isSafeInteger(product.stock)) throw new PaymentError("ตรวจสอบสต็อกสินค้าไม่สำเร็จ กรุณาลองใหม่", 409);
  if (!isTiDBProduct(productId) && typeof (product as RemoteProduct).stockOperationId !== "string") {
    throw new PaymentError("ระบบสต็อกสินค้านี้ยังไม่พร้อม กรุณาติดต่อร้านค้า", 503);
  }
  return product.stock;
}

/** Called with the product lock held. Unapplied remote sales also consume availability. */
async function availableStock(tx: Prisma.TransactionClient, productId: string) {
  if (await tx.stockMovement.count({ where: { productId, state: "review" } })) throw new PaymentError("สต็อกสินค้านี้กำลังรอตรวจสอบ กรุณาติดต่อร้านค้า", 409);
  const stock = await productStock(tx, productId);
  const held = await heldQuantity(tx, productId);
  const pending = await tx.stockMovement.aggregate({ where: { productId, state: { not: "applied" }, direction: "take" }, _sum: { quantity: true } });
  return stock - held - (pending._sum.quantity ?? 0);
}

/** Save the checkout and its reservations together, before contacting the bank. Never use cached balances here. */
export async function reserveCheckoutStock(tx: Prisma.TransactionClient, checkoutId: string, input: readonly StockLine[]) {
  const lines = validLines(input);
  await lockStock(tx, lines.map((line) => line.productId));
  for (const line of lines) {
    if (await availableStock(tx, line.productId) < line.quantity) throw new PaymentError("มีสินค้าไม่พอหรือถูกจองแล้ว กรุณาตรวจสอบตะกร้าอีกครั้ง", 409);
  }
  await tx.stockReservation.createMany({ data: lines.map((line) => ({ ...line, checkoutId })) });
}

/** Release only after a definitive bank failure/expiry; a network timeout may still have charged the customer. */
export async function releaseCheckoutStock(tx: Prisma.TransactionClient, checkoutId: string) {
  const lines = await tx.stockReservation.findMany({ where: { checkoutId, state: "held" } });
  await lockStock(tx, lines.map((line) => line.productId));
  await tx.stockReservation.updateMany({ where: { checkoutId, state: "held" }, data: { state: "released" } });
}

/** Atomic TiDB changes plus durable MockAPI deltas, committed with payment/cancellation. */
export async function adjustDatabaseStock(tx: Prisma.TransactionClient, input: readonly Partial<StockLine>[], direction: StockDirection, checkoutId: string): Promise<StockLine[]> {
  const lines = validLines(input);
  await lockStock(tx, lines.map((line) => line.productId));
  if (direction === "take") {
    const reserved = await tx.stockReservation.findMany({ where: { checkoutId, state: "held" } });
    const quantities = new Map(reserved.map((line) => [line.productId, line.quantity]));
    // Old pending checkouts have no reservation. Allocate only stock not promised to another customer.
    for (const line of lines) {
      const own = quantities.get(line.productId) ?? 0;
      if (own === line.quantity) continue;
      try {
        if (await availableStock(tx, line.productId) + own < line.quantity) throw new StockUnavailableError();
      } catch (error) {
        if (error instanceof StockUnavailableError) throw error;
        throw new StockUnavailableError("ยังตรวจสอบสต็อกสินค้าไม่ได้ กรุณาตรวจสอบและจัดสรรสินค้าอีกครั้ง");
      }
    }
    await tx.stockReservation.updateMany({ where: { checkoutId, state: "held" }, data: { state: "consumed" } });
  }
  const external: StockLine[] = [];
  for (const line of lines) {
    if (isTiDBProduct(line.productId)) {
      const updated = await tx.product.updateMany({
        where: { id: line.productId, ...(direction === "take" ? { stock: { gte: line.quantity } } : {}) },
        data: { stock: direction === "take" ? { decrement: line.quantity } : { increment: line.quantity } },
      });
      if (!updated.count) throw new PaymentError("ไม่พบสินค้าหรือสต็อกไม่เพียงพอ กรุณาติดต่อร้านค้า", 409);
    } else {
      // Allocate order under the product lock; distributed AUTO_INCREMENT ids need not reflect commit order.
      const { nextSequence } = await tx.stockLock.update({ where: { productId: line.productId }, data: { nextSequence: { increment: 1 } }, select: { nextSequence: true } });
      await tx.stockMovement.createMany({ data: [{ ...line, checkoutId, direction, sequence: nextSequence, operationId: randomUUID() }], skipDuplicates: true });
      external.push(line);
    }
  }
  return external;
}

/** Commit the send intent before touching MockAPI. An uncertain PUT is only checked, never blindly repeated. */
export async function applyNextStockMovement(productId: string) {
  try {
    const prepared = await stockTransaction(async (tx) => {
      await lockStock(tx, [productId]);
      const job = await tx.stockMovement.findFirst({ where: { productId, state: { not: "applied" } }, orderBy: { sequence: "asc" } });
      if (!job || job.state === "review") return null;
      const mayWrite = job.state === "pending";
      if (mayWrite) await tx.stockMovement.update({ where: { id: job.id }, data: { state: "sending", attempts: { increment: 1 } } });
      return { job, mayWrite };
    });
    if (!prepared) return false;
    return await stockTransaction(async (tx) => {
      await lockStock(tx, [productId]);
      const job = await tx.stockMovement.findFirst({ where: { productId, state: { not: "applied" } }, orderBy: { sequence: "asc" } });
      if (!job || job.id !== prepared.job.id || job.state === "review") return false;
      let putAttempted = false;
      let review = false;
      try {
        const resource = `products/${encodeURIComponent(productId)}`;
        const product = await catalogRequest<RemoteProduct>(resource);
        if (product.stockOperationId !== job.operationId) {
          // Another worker/process may still be writing. Advancing the queue or re-sending could overwrite it.
          if (!prepared.mayWrite) {
            await tx.stockMovement.update({ where: { id: job.id }, data: { lastError: "Unconfirmed MockAPI write; verify provider state before resetting to pending" } });
            return false;
          }
          if (typeof product.stockOperationId !== "string") { review = true; throw new Error("Configure the MockAPI stockOperationId string field before retrying"); }
          if (!Number.isSafeInteger(product.stock)) { review = true; throw new Error("Invalid remote stock"); }
          const stock = product.stock + (job.direction === "take" ? -job.quantity : job.quantity);
          if (stock < 0) { review = true; throw new Error("Remote stock is insufficient; adjustment requires review"); }
          putAttempted = true;
          const updated = await catalogRequest<RemoteProduct>(resource, { method: "PUT", body: JSON.stringify({ stock, stockOperationId: job.operationId }) });
          if (updated.stock !== stock || updated.stockOperationId !== job.operationId) { review = true; throw new Error("MockAPI did not acknowledge the stock receipt; inspect remote state before retrying"); }
        }
        await tx.stockMovement.update({ where: { id: job.id }, data: { state: "applied", lastError: null } });
        return true;
      } catch (error) {
        // GET failures are safe to retry. A PUT timeout could still complete later, so only poll its receipt.
        const state = review ? "review" : putAttempted ? "uncertain" : prepared.mayWrite ? "pending" : job.state;
        await tx.stockMovement.update({ where: { id: job.id }, data: { state, lastError: (error instanceof Error ? error.message : "Stock adjustment failed").slice(0, 255) } });
        return false;
      }
    });
  } catch (error) {
    console.error("Stock worker failed; movement remains queued", { productId, error: error instanceof Error ? error.message : "unknown" });
    return false;
  }
}

export function invalidateStockCatalog() {
  try { revalidateTag(CATALOG_TAG, { expire: 0 }); } catch { /* Scripts/tests have no request cache context. */ }
}

/** Best effort delivery only; the durable queue survives request failures, restarts and duplicate events. */
export async function finishStockAdjustment(external: readonly StockLine[]) {
  const ids = [...new Set(external.map((line) => line.productId))];
  await Promise.all(ids.map((id) => applyNextStockMovement(id)));
  invalidateStockCatalog();
}

export async function retryStockMovements(limit = 20) {
  const { prisma } = await import("./prisma");
  const jobs = await prisma.stockMovement.findMany({ where: { state: { in: ["pending", "sending", "uncertain"] } }, orderBy: { id: "asc" }, take: limit, select: { productId: true } });
  let applied = 0;
  // Bounded sequential processing respects per-product order even when several jobs share a product.
  for (const job of jobs) if (await applyNextStockMovement(job.productId)) applied++;
  if (applied) invalidateStockCatalog();
  const review = await prisma.stockMovement.count({ where: { state: { in: ["review", "uncertain", "sending"] } } });
  const pending = await prisma.stockMovement.count({ where: { state: { not: "applied" } } });
  return { attempted: jobs.length, applied, pending, review };
}
