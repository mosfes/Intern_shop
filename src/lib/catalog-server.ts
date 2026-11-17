import { cacheLife, cacheTag } from "next/cache";
import { brandLogoMap } from "@/data/brand-logos";
import { brandSlug, buildCatalog, type CatalogData } from "./catalog";
import type { Category, Product } from "./types";
import { getAdminProducts } from "./admin-products";

/** Cache tag for the catalogue — call revalidateTag("catalog") after an admin edit. */
export const CATALOG_TAG = "catalog";

/** True when the admin has uploaded a logo for this slug (HEAD on the public R2 URL; any failure = no logo). */
async function hasUploadedLogo(slug: string) {
  const base = process.env.NEXT_PUBLIC_IMAGE_BASE_URL?.replace(/\/$/, "");
  if (!base) return false;
  try {
    const res = await fetch(`${base}/brands/${slug}`, { method: "HEAD", signal: AbortSignal.timeout(4000) });
    return res.ok;
  } catch {
    return false;
  }
}

/** Combined TiDB and MockAPI catalogue, cached and shared across requests. */
export async function getCatalogData(): Promise<CatalogData> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  const { products, categories, brands } = await getAdminProducts();

  // Rows added by hand in the mockapi UI can be empty ({ id } only) — skip anything incomplete.
  const validProduct = (p: Partial<Product>) =>
    !!p.slug && !!p.name && !!p.category && typeof p.price === "number" && Array.isArray(p.images) && p.images.length > 0;
  const validCategory = (c: Partial<Category>) => !!c.slug && !!c.nameTh && !!c.image;

  const validProducts = products.filter(validProduct);
  // Brands that already have a bundled SVG (src/data/brand-logos.ts) don't need a lookup.
  const brandsToCheck = [...new Set(validProducts.map((p) => p.brand))].filter((b) => b && !brandLogoMap[b]);
  const checked = await Promise.all(
    brandsToCheck.map(async (b) => [brandSlug(b), await hasUploadedLogo(brandSlug(b))] as const),
  );

  return {
    brandAssets: brands.map(({ name, logoUrl }) => ({ name, logoUrl })),
    logoSlugs: checked.filter(([, ok]) => ok).map(([slug]) => slug),
    // New TiDB products come first; MockAPI products retain their numeric order.
    products: products
      .filter(validProduct)
      .sort((a, b) => a.source !== b.source ? (a.source === "tidb" ? -1 : 1) : a.source === "mockapi" ? Number(a.id) - Number(b.id) : 0)
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
      // The category id is mockapi's, not ours, and default spec rows are admin-only.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ id, specFields, ...category }: Category & { id?: string }) => category),
  };
}

export async function getCatalog() {
  return buildCatalog(await getCatalogData());
}
