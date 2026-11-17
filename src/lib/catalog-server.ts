import { cacheLife, cacheTag } from "next/cache";
import { buildCatalog, type CatalogData, type CatalogMeta } from "./catalog";
import type { Category, Product } from "./types";
import { FLASH_SALE_TAG, getHomepageFlashSale, getStorefrontFlashSaleOffers } from "./flash-sale-server";
import { prisma } from "./prisma";
import { storedCategories } from "./catalog-metadata";
import { getAdminProducts } from "./admin-products";

/** Cache tag for the catalogue — call revalidateTag("catalog") after an admin edit. */
export const CATALOG_TAG = "catalog";

/** Combined TiDB and MockAPI catalogue, cached and shared across requests. */
export async function getCatalogData(): Promise<CatalogData> {
  "use cache";
  cacheTag(CATALOG_TAG, FLASH_SALE_TAG);

  const [{ products, categories, brands, mockapiUnavailable }, flashSaleSettings, offers] = await Promise.all([getAdminProducts({ storefront: true }), getHomepageFlashSale(), getStorefrontFlashSaleOffers()]);
  // A fallback catalogue (MockAPI down) is kept briefly so the next request retries soon; stale ≥ 30s keeps
  // the root layout prerenderable (the "seconds" preset would not).
  if (mockapiUnavailable) cacheLife({ stale: 30, revalidate: 30, expire: 300 });
  else cacheLife("minutes");
  const offerMap = new Map(offers.map((offer) => [offer.productId, offer.price]));

  // Rows added by hand in the mockapi UI can be empty ({ id } only) — skip anything incomplete.
  const validProduct = (p: Partial<Product>) =>
    !!p.slug && !!p.name && !!p.category && typeof p.price === "number" && Array.isArray(p.images) && p.images.length > 0;
  const validCategory = (c: Partial<Category>) => !!c.slug && !!c.nameTh && !!c.image;

  return {
    // Uploaded logos come from Brand.logoUrl only (no per-brand HEAD probe to R2 on every cache refresh).
    // Logos uploaded before URLs were saved: run `npm run db:backfill-brand-logos` once.
    brandAssets: brands.map(({ name, logoUrl }) => ({ name, logoUrl })),
    // New TiDB products come first; MockAPI products retain their numeric order.
    products: products
      .filter(validProduct)
      .sort((a, b) => a.source !== b.source ? (a.source === "tidb" ? -1 : 1) : a.source === "mockapi" ? Number(a.id) - Number(b.id) : 0)
      .map((p) => ({
        ...p,
        flashSale: offerMap.has(p.id) ? { ...flashSaleSettings, price: offerMap.get(p.id)!, regularPrice: p.price, regularOriginalPrice: p.originalPrice ?? p.price } : undefined,
        originalPrice: p.originalPrice ?? p.price,
        discount: p.discount ?? 0,
        stock: p.stock ?? 0,
        rating: p.rating ?? 0,
        reviewCount: p.reviewCount ?? 0,
        tags: [...(p.tags ?? []).filter((tag) => tag !== "flash-sale"), ...(offerMap.has(p.id) ? ["flash-sale" as const] : [])],
        highlights: p.highlights ?? [],
        shortSpecs: p.shortSpecs ?? [],
        specifications: p.specifications ?? [],
        reviews: p.reviews ?? [],
        description: p.description ?? "",
        warranty: p.warranty ?? "",
      })),
    categories: categories
      .filter(validCategory)
      // The category id is mockapi's, not ours, and default spec rows are admin-only.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ id, specFields, ...category }: Category & { id?: string }) => category),
  };
}

export async function getCatalog() {
  return buildCatalog(await getCatalogData());
}

/** Navigation and account pages need metadata, without products, reviews or external catalogue requests. */
export async function getCatalogMeta(): Promise<CatalogMeta> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("minutes");
  const [categories, brandAssets] = await Promise.all([
    prisma.category.findMany({ orderBy: { nameTh: "asc" }, select: { slug: true, name: true, nameTh: true, description: true, image: true } }),
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { name: true, logoUrl: true } }),
  ]);
  return { categories: storedCategories(categories).filter((category) => category.slug && category.nameTh && category.image), brandAssets };
}
