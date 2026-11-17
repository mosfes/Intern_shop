import { revalidateTag } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { catalogRequest, isTiDBProduct } from "./admin-products";
import { CATALOG_TAG } from "./catalog-server";
import type { OrderLine, Product } from "./types";

export type StockLine = Pick<OrderLine, "productId" | "quantity">;
export type StockDirection = "take" | "return";

const validLines = (lines: readonly Partial<StockLine>[]) =>
  lines.filter((line): line is StockLine => typeof line.productId === "string" && Number.isInteger(line.quantity) && (line.quantity as number) > 0);

/**
 * Moves stock for the TiDB products in an order inside the caller's transaction, so it commits (or rolls back)
 * together with the payment or cancellation that caused it. The change is one atomic increment/decrement, never
 * read-then-write, so two orders settling at once cannot overwrite each other. Stock may go below zero when a paid
 * order outruns the shelf: the admin overview then lists the product as low on stock instead of the sale being lost.
 *
 * Returns the MockAPI lines, which live in another service and must be applied after the transaction commits.
 */
export async function adjustDatabaseStock(tx: Prisma.TransactionClient, lines: readonly Partial<StockLine>[], direction: StockDirection): Promise<StockLine[]> {
  const external: StockLine[] = [];
  for (const line of validLines(lines)) {
    if (!isTiDBProduct(line.productId)) { external.push(line); continue; }
    await tx.product.updateMany({
      where: { id: line.productId },
      data: { stock: direction === "take" ? { decrement: line.quantity } : { increment: line.quantity } },
    });
  }
  return external;
}

/**
 * MockAPI cannot do atomic updates, so this reads the product and writes it back. It is best effort: a failure is
 * logged for an admin to correct by hand and never fails the payment that already succeeded.
 */
export async function adjustExternalStock(lines: readonly StockLine[], direction: StockDirection) {
  for (const line of lines) {
    try {
      const resource = `products/${encodeURIComponent(line.productId)}`;
      const product = await catalogRequest<Product>(resource);
      const stock = (Number(product.stock) || 0) + (direction === "take" ? -line.quantity : line.quantity);
      await catalogRequest<Product>(resource, { method: "PUT", body: JSON.stringify({ ...product, stock }) });
    } catch (error) {
      console.error("MockAPI stock adjustment failed; correct it by hand", { productId: line.productId, quantity: line.quantity, direction, error: error instanceof Error ? error.message : "" });
    }
  }
}

/** Runs after the transaction commits: applies the MockAPI part and drops the cached catalogue so the shop shows the new stock. */
export async function finishStockAdjustment(external: readonly StockLine[], direction: StockDirection) {
  await adjustExternalStock(external, direction);
  try { revalidateTag(CATALOG_TAG, { expire: 0 }); } catch { /* outside a request (scripts, tests): the cache expires on its own */ }
}
