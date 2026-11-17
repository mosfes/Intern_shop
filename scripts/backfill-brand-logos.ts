import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { brandLogoMap } from "../src/data/brand-logos";
import { brandSlug } from "../src/lib/catalog";

/**
 * Older admin builds uploaded brand logos to R2 at brands/<slug> without saving the URL. The storefront now
 * reads logos only from Brand.logoUrl (no HEAD probe per brand), so copy those URLs into the table once.
 * Safe to re-run: only brands with no logoUrl and no bundled SVG are checked, and nothing is overwritten.
 */
async function main() {
  const base = process.env.NEXT_PUBLIC_IMAGE_BASE_URL?.replace(/\/+$/, "");
  if (!base) throw new Error("NEXT_PUBLIC_IMAGE_BASE_URL is not set");
  try {
    const brands = await prisma.brand.findMany({ where: { logoUrl: null }, select: { id: true, name: true } });
    let updated = 0;
    for (const brand of brands.filter((b) => !brandLogoMap[b.name])) {
      const url = `${base}/brands/${brandSlug(brand.name)}`;
      const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(10000) }).catch(() => null);
      if (!response?.ok) continue;
      const { count } = await prisma.brand.updateMany({ where: { id: brand.id, logoUrl: null }, data: { logoUrl: url } });
      if (count) { updated++; console.log(`${brand.name} → ${url}`); }
    }
    console.log(`Backfilled ${updated} brand logo URL(s).`);
  } finally { await prisma.$disconnect(); }
}
main().catch((error) => { console.error("Unable to backfill brand logos.", error instanceof Error ? error.message : ""); process.exitCode = 1; });
