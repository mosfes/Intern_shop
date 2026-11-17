import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "./prisma";
import { DEFAULT_FLASH_SALE, type FlashSaleSettings, type FlashSaleOffer } from "./flash-sale";

export const FLASH_SALE_TAG = "flash-sale-settings";
export async function getFlashSaleSettings(): Promise<FlashSaleSettings> {
  const row = await prisma.flashSaleSetting.findUnique({ where: { id: "homepage" } });
  return row ? { enabled: row.enabled, startsAt: row.startsAt?.toISOString() ?? null, endsAt: row.endsAt?.toISOString() ?? null } : { ...DEFAULT_FLASH_SALE };
}
export async function getHomepageFlashSale(): Promise<FlashSaleSettings> {
  "use cache";
  cacheLife("minutes");
  cacheTag(FLASH_SALE_TAG);
  try { return await getFlashSaleSettings(); }
  catch {
    console.error("Flash Sale settings unavailable. Run npm run db:setup-flash-sale.");
    // Never show a potentially expired sale when its schedule cannot be read.
    return { enabled: false, startsAt: null, endsAt: null };
  }
}

export async function getFlashSaleOffers(): Promise<FlashSaleOffer[]> {
  const rows = await prisma.flashSaleItem.findMany({ orderBy: { updatedAt: "asc" } });
  return rows.map((row) => ({ productId: row.productId, price: Number(row.price) }));
}

export async function getStorefrontFlashSaleOffers(): Promise<FlashSaleOffer[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(FLASH_SALE_TAG);
  try { return await getFlashSaleOffers(); }
  catch { return []; }
}
