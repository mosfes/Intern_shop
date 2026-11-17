import type { Category, Product } from "./types";
import { prisma } from "./prisma";
import type { ProductInput } from "./product-management";
import type { Prisma } from "@/generated/prisma/client";
import { createDatabaseProduct, databaseProductInclude, fromDatabaseProduct, updateDatabaseProduct } from "./product-storage";
import { storedCategories, toSpecFields } from "./catalog-metadata";

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

export async function updateStoredProduct(existing: SourcedProduct, input: ProductInput, category: Category, tx?: Prisma.TransactionClient) {
  const { id, source, ...data } = { ...existing, ...input };
  if (source === "tidb") return updateDatabaseProduct(id, input, category, tx);
  return { ...await catalogRequest<Product>(`products/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify({ id, ...data }) }), source: "mockapi" as const };
}

export async function deleteStoredProduct(id: string) {
  if (isTiDBProduct(id)) {
    const result = await prisma.product.deleteMany({ where: { id } });
    if (!result.count) throw new CatalogApiError(404);
  } else await catalogRequest(`products/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export class CatalogApiError extends Error {
  constructor(public status: number) { super("Catalog request failed"); }
}

export async function catalogRequest<T>(resource: string, init?: RequestInit): Promise<T> {
  const base = process.env.MOCKAPI_BASE_URL?.replace(/\/$/, "");
  if (!base) throw new Error("Catalog is not configured");
  const response = await fetch(`${base}/${resource}`, {
    ...init, cache: "no-store", signal: AbortSignal.timeout(15000),
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) throw new CatalogApiError(response.status);
  return response.json() as Promise<T>;
}

export async function getAdminProducts() {
  const [products, databaseProducts, databaseCategories, brands] = await Promise.all([
    catalogRequest<Product[]>("products"),
    prisma.product.findMany({ orderBy: [{ createdAt: "desc" }, { id: "asc" }], include: databaseProductInclude }),
    prisma.category.findMany({ orderBy: { nameTh: "asc" }, include: { specFields: { orderBy: { position: "asc" } } } }),
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, logoUrl: true } }),
  ]);
  if (!Array.isArray(products)) throw new Error("Invalid catalog response");
  return {
    products: [
      ...databaseProducts.map(fromDatabaseProduct),
      ...products.filter((product) => product.name && product.slug).map((product) => ({ ...product, source: "mockapi" as const })),
    ],
    categories: storedCategories(databaseCategories).map(({ slug, name, nameTh, description, image, specFields }) => ({ slug, name, nameTh, description, image, specFields: toSpecFields(specFields) })),
    brands,
  };
}
