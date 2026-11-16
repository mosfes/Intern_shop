import { cacheLife, cacheTag } from "next/cache";
import { buildCatalog, type CatalogData } from "./catalog";
import type { Category, Product } from "./types";

/** Cache tag for the catalogue — call revalidateTag("catalog") after an admin edit. */
export const CATALOG_TAG = "catalog";

async function getJson<T>(resource: string): Promise<T> {
  const base = process.env.MOCKAPI_BASE_URL?.replace(/\/$/, "");
  if (!base) throw new Error("MOCKAPI_BASE_URL is not set");
  const res = await fetch(`${base}/${resource}`);
  if (!res.ok) throw new Error(`mockapi ${resource}: HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

/** Products and categories from mockapi.io, cached and shared across requests. */
export async function getCatalogData(): Promise<CatalogData> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  const [products, categories] = await Promise.all([
    getJson<Product[]>("products"),
    getJson<(Category & { id?: string })[]>("categories"),
  ]);

  // Rows added by hand in the mockapi UI can be empty ({ id } only) — skip anything incomplete.
  const validProduct = (p: Partial<Product>) =>
    !!p.slug && !!p.name && !!p.category && typeof p.price === "number" && Array.isArray(p.images) && p.images.length > 0;
  const validCategory = (c: Partial<Category>) => !!c.slug && !!c.nameTh && !!c.image;

  return {
    // mockapi ids are numeric strings — keep the API order (1, 2, 3…).
    products: products
      .filter(validProduct)
      .sort((a, b) => Number(a.id) - Number(b.id))
      .map((p) => ({
        ...p,
        originalPrice: p.originalPrice ?? p.price,
        discount: p.discount ?? 0,
        stock: p.stock ?? 0,
        rating: p.rating ?? 0,
        reviewCount: p.reviewCount ?? 0,
        tags: p.tags ?? [],
        highlights: p.highlights ?? [],
        shortSpecs: p.shortSpecs ?? [],
        specifications: p.specifications ?? [],
        reviews: p.reviews ?? [],
        description: p.description ?? "",
        warranty: p.warranty ?? "",
      })),
    categories: categories
      .filter(validCategory)
      .sort((a, b) => Number(a.id) - Number(b.id))
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the category id is mockapi's, not ours
      .map(({ id, ...category }) => category),
  };
}

export async function getCatalog() {
  return buildCatalog(await getCatalogData());
}
