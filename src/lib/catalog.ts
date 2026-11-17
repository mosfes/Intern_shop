import type { Category, CategorySlug, Product, ProductTag } from "./types";

/** Raw catalogue as loaded from the API — plain JSON, safe to pass from server to client. */
export interface CatalogData {
  products: Product[];
  categories: Category[];
  /** Brand slugs that have an uploaded logo in R2 (brands/<slug>) — see brandSlug(). */
  logoSlugs?: string[];
  brandAssets?: { name: string; logoUrl: string | null }[];
}

/** "Western Digital" → "western-digital". Must match the admin app, which names the R2 logo file with it. */
export function brandSlug(brand: string) {
  return brand
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const PRICE_MIN = 0;

/**
 * Lookups and helpers derived from the catalogue. Works on both server and client:
 * server components build it from `getCatalog()`, client components get it from `useCatalog()`.
 */
export function buildCatalog({ products, categories, logoSlugs = [], brandAssets = [] }: CatalogData) {
  const logoSet = new Set(logoSlugs);
  const customLogos = new Map(brandAssets.filter((brand) => brand.logoUrl).map((brand) => [brand.name.toLocaleLowerCase(), brand.logoUrl!]));
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
    managedBrands: brandAssets.map(({ name }) => name),
    priceMax,
    categoryCounts,

    /** Same-origin URL of a logo uploaded through the admin, or null (see the /brand-logos rewrite in next.config.ts). */
    uploadedLogoUrl(brand: string) {
      const custom = customLogos.get(brand.toLocaleLowerCase());
      if (custom) return custom;
      const slug = brandSlug(brand);
      return logoSet.has(slug) ? `/brand-logos/${slug}` : null;
    },

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
