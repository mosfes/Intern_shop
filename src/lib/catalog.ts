import type { Category, CategorySlug, Product, ProductTag } from "./types";

/** Raw catalogue as loaded from the API — plain JSON, safe to pass from server to client. */
export interface CatalogData {
  products: Product[];
  categories: Category[];
}

export const PRICE_MIN = 0;

/**
 * Lookups and helpers derived from the catalogue. Works on both server and client:
 * server components build it from `getCatalog()`, client components get it from `useCatalog()`.
 */
export function buildCatalog({ products, categories }: CatalogData) {
  const productMap = new Map(products.map((p) => [p.id, p]));
  const productBySlug = new Map(products.map((p) => [p.slug, p]));
  const categoryMap = new Map(categories.map((c) => [c.slug, c]));
  const brands = Array.from(new Set(products.map((p) => p.brand))).sort((a, b) => a.localeCompare(b));
  const priceMax = Math.max(1000, Math.ceil(Math.max(0, ...products.map((p) => p.price)) / 1000) * 1000);

  const categoryCounts: Record<string, number> = {};
  for (const p of products) categoryCounts[p.category] = (categoryCounts[p.category] ?? 0) + 1;

  return {
    products,
    categories,
    productMap,
    productBySlug,
    categoryMap,
    brands,
    priceMax,
    categoryCounts,

    isCategorySlug(value: string | null | undefined): value is CategorySlug {
      return !!value && categoryMap.has(value);
    },

    getProductsByTag(tag: ProductTag, limit = 8) {
      return products.filter((p) => p.tags.includes(tag)).slice(0, limit);
    },

    getRelatedProducts(product: Product, limit = 4) {
      const same = products.filter((p) => p.category === product.category && p.id !== product.id);
      const others = products.filter((p) => p.category !== product.category && p.brand === product.brand);
      return [...same, ...others].slice(0, limit);
    },

    /** Brands (with product counts) within the given categories — all brands when none are selected. */
    brandsForCategories(selected: CategorySlug[]) {
      const counts: Record<string, number> = {};
      for (const p of products) {
        if (selected.length === 0 || selected.includes(p.category)) counts[p.brand] = (counts[p.brand] ?? 0) + 1;
      }
      return Object.entries(counts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([brand, count]) => ({ brand, count }));
    },
  };
}

export type Catalog = ReturnType<typeof buildCatalog>;
