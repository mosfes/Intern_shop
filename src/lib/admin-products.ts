import type { Category, Product } from "./types";
import { prisma } from "./prisma";
import type { ProductInput } from "./product-management";
import type { Prisma } from "@/generated/prisma/client";
import { createDatabaseProduct, databaseProductInclude, fromDatabaseProduct, updateDatabaseProduct } from "./product-storage";
import { storedCategories, toSpecFields } from "./catalog-metadata";
import { checkStockEdit, lockStock, StockConflictError, stockTransaction } from "./stock-coordination";
import { PaymentError } from "./payments";
export { StockConflictError } from "./stock-coordination";

export type SourcedProduct = Product & { source: "mockapi" | "tidb" };

export function isTiDBProduct(id: string) { return id.startsWith("tidb_"); }

export async function getStoredProduct(id: string): Promise<SourcedProduct> {
  if (!isTiDBProduct(id)) return { ...await catalogRequest<Product>(`products/${encodeURIComponent(id)}`), source: "mockapi" };
  const row = await prisma.product.findUnique({ where: { id }, include: databaseProductInclude });
  if (!row) throw new CatalogApiError(404);
  return fromDatabaseProduct(row);
}

export async function createTiDBProduct(input: ProductInput, category: Category, tx?: Prisma.TransactionClient) {
  return createDatabaseProduct(input, category, undefined, tx);
}

export async function updateStoredProduct(existing: SourcedProduct, input: ProductInput, category: Category, client?: Prisma.TransactionClient, expectedStock?: number) {
  const { id } = existing;
  const write = async (tx: Prisma.TransactionClient) => {
    await lockStock(tx, [id]);
    const current = isTiDBProduct(id)
      ? await tx.product.findUnique({ where: { id }, include: databaseProductInclude }).then((row) => row ? fromDatabaseProduct(row) : null)
      : await getStoredProduct(id);
    if (!current) throw new CatalogApiError(404);
    if (!Number.isSafeInteger(expectedStock)) throw new PaymentError("ข้อมูลสต็อกเดิมไม่ถูกต้อง กรุณาโหลดรายการใหม่", 400);
    if (current.stock !== expectedStock) throw new StockConflictError(current.stock);
    await checkStockEdit(tx, id, input.stock);
    if (isTiDBProduct(id)) return updateDatabaseProduct(id, input, category, tx);
    // Partial update preserves the worker's receipt and unrelated remote fields.
    return { ...await catalogRequest<Product>(`products/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) }), source: "mockapi" as const };
  };
  return client ? write(client) : stockTransaction(write);
}

export async function deleteStoredProduct(id: string) {
  return stockTransaction(async (tx) => {
    await lockStock(tx, [id]);
    await checkStockEdit(tx, id);
    if (isTiDBProduct(id)) {
      const result = await tx.product.deleteMany({ where: { id } });
      if (!result.count) throw new CatalogApiError(404);
    } else await catalogRequest(`products/${encodeURIComponent(id)}`, { method: "DELETE" });
  });
}

/** Change only stock, and reject an outdated count instead of overwriting a sale. */
export async function updateStoredProductStock(id: string, stock: number, expectedStock: number) {
  return stockTransaction(async (tx) => {
    await lockStock(tx, [id]);
    await checkStockEdit(tx, id, stock);
    if (isTiDBProduct(id)) {
      const result = await tx.product.updateMany({ where: { id, stock: expectedStock }, data: { stock } });
      const current = await tx.product.findUnique({ where: { id }, select: { id: true, stock: true } });
      if (!current) throw new CatalogApiError(404);
      if (!result.count) throw new StockConflictError(current.stock);
      return current;
    }
    const existing = await getStoredProduct(id);
    if (existing.stock !== expectedStock) throw new StockConflictError(existing.stock);
    const updated = await catalogRequest<Product>(`products/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify({ stock }) });
    return { id, stock: updated.stock };
  });
}

export class CatalogApiError extends Error {
  constructor(public status: number) { super("Catalog request failed"); }
}

export async function catalogRequest<T>(resource: string, init?: RequestInit): Promise<T> {
  const base = process.env.MOCKAPI_BASE_URL?.replace(/\/$/, "");
  if (!base) throw new Error("Catalog is not configured");
  const response = await fetch(`${base}/${resource}`, {
    cache: "no-store", signal: AbortSignal.timeout(15000), ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) throw new CatalogApiError(response.status);
  return response.json() as Promise<T>;
}

/** Last good MockAPI product list in this server process — the storefront falls back to it if MockAPI fails. */
let lastMockapiProducts: Product[] | undefined;

/**
 * TiDB + MockAPI products, categories and brands. Admin callers get errors as-is; `storefront` uses a shorter
 * MockAPI timeout and, if MockAPI fails, keeps serving the last good list (or TiDB products only) instead of
 * failing every page — `mockapiUnavailable` tells the caller to cache that result only briefly.
 */
export async function getAdminProducts({ storefront = false } = {}) {
  const remote = catalogRequest<Product[]>("products", storefront ? { signal: AbortSignal.timeout(5000) } : undefined)
    .then((list) => {
      if (!Array.isArray(list)) throw new Error("Invalid catalog response");
      if (storefront) lastMockapiProducts = list;
      return list;
    });
  let mockapiUnavailable = false;
  const [products, databaseProducts, databaseCategories, brands] = await Promise.all([
    storefront
      ? remote.catch((error: unknown) => {
        console.error("MockAPI catalogue unavailable; serving", lastMockapiProducts ? "the last good list." : "TiDB products only.", error instanceof Error ? error.message : "");
        mockapiUnavailable = true;
        return lastMockapiProducts ?? [];
      })
      : remote,
    prisma.product.findMany({ orderBy: [{ createdAt: "desc" }, { id: "asc" }], include: databaseProductInclude }),
    prisma.category.findMany({ orderBy: { nameTh: "asc" }, include: { specFields: { orderBy: { position: "asc" } } } }),
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, logoUrl: true } }),
  ]);
  return {
    mockapiUnavailable,
    products: [
      ...databaseProducts.map(fromDatabaseProduct),
      ...products.filter((product) => product.name && product.slug).map((product) => ({ ...product, source: "mockapi" as const })),
    ],
    categories: storedCategories(databaseCategories).map(({ slug, name, nameTh, description, image, specFields }) => ({ slug, name, nameTh, description, image, specFields: toSpecFields(specFields) })),
    brands,
  };
}
