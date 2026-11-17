import type { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { adminJson, authorizeAdmin } from "@/lib/admin-auth";
import { withAdminActivity } from "@/lib/admin-activity";
import { CatalogApiError, getStoredProduct } from "@/lib/admin-products";
import { CATALOG_TAG } from "@/lib/catalog-server";
import { prisma } from "@/lib/prisma";
import { FlashSaleInputError, validateFlashSalePrice, validateFlashSaleSettings } from "@/lib/flash-sale";
import { FLASH_SALE_TAG, getFlashSaleOffers, getFlashSaleSettings } from "@/lib/flash-sale-server";

export async function GET(request: NextRequest) {
  try {
    const denied = await authorizeAdmin(request);
    if (denied) return denied;
    const [settings, offers] = await Promise.all([getFlashSaleSettings(), getFlashSaleOffers()]);
    return adminJson({ settings, offers });
  } catch { return adminJson({ error: "โหลดเวลาแฟลชเซลไม่สำเร็จ กรุณาลองอีกครั้ง" }, 503); }
}

export const PUT = withAdminActivity("flash-sale", async (request: NextRequest) => {
  try {
    const denied = await authorizeAdmin(request, true);
    if (denied) return denied;
    let body;
    try { body = await request.json(); } catch { return adminJson({ error: "ข้อมูลไม่ถูกต้อง" }, 400); }
    const settings = validateFlashSaleSettings(body);
    const data = { enabled: settings.enabled, startsAt: settings.startsAt ? new Date(settings.startsAt) : null, endsAt: settings.endsAt ? new Date(settings.endsAt) : null };
    await prisma.flashSaleSetting.upsert({ where: { id: "homepage" }, create: { id: "homepage", ...data }, update: data });
    revalidateTag(FLASH_SALE_TAG, { expire: 0 });
    return adminJson({ settings });
  } catch (error) {
    if (error instanceof FlashSaleInputError) return adminJson({ error: error.message }, 400);
    return adminJson({ error: "บันทึกเวลาแฟลชเซลไม่สำเร็จ กรุณาลองอีกครั้ง" }, 503);
  }
});

export const PATCH = withAdminActivity("flash-sale", async (request: NextRequest) => {
  try {
    const denied = await authorizeAdmin(request, true);
    if (denied) return denied;
    let body;
    try { body = await request.json(); } catch { return adminJson({ error: "ข้อมูลไม่ถูกต้อง" }, 400); }
    if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(body.id) || typeof body.active !== "boolean") {
      return adminJson({ error: "กรุณาระบุสินค้าและสถานะแฟลชเซลให้ถูกต้อง" }, 400);
    }
    if (body.active) {
      const existing = await getStoredProduct(body.id);
      const price = validateFlashSalePrice(body.price, existing.price);
      await prisma.flashSaleItem.upsert({ where: { productId: body.id }, create: { productId: body.id, price }, update: { price } });
    } else {
      await prisma.flashSaleItem.deleteMany({ where: { productId: body.id } });
    }
    revalidateTag(FLASH_SALE_TAG, { expire: 0 });
    revalidateTag(CATALOG_TAG, { expire: 0 });
    return adminJson({ id: body.id, active: body.active, price: body.active ? body.price : null });
  } catch (error) {
    if (error instanceof FlashSaleInputError) return adminJson({ error: error.message }, 400);
    if (error instanceof CatalogApiError && error.status === 404 || error && typeof error === "object" && "code" in error && ["P2025", "P2003"].includes(String(error.code))) return adminJson({ error: "ไม่พบสินค้า กรุณาโหลดรายการใหม่" }, 404);
    return adminJson({ error: "บันทึกแฟลชเซลไม่สำเร็จ กรุณาลองอีกครั้ง" }, 503);
  }
});
