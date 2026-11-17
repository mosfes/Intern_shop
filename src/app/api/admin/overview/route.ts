import type { NextRequest } from "next/server";
import { adminJson, authorizeAdmin } from "@/lib/admin-auth";
import { LOW_STOCK, lowStockProducts, type AdminOverview } from "@/lib/admin-overview";
import { loadOrderOverview } from "@/lib/admin-overview-server";
import { getCatalogData } from "@/lib/catalog-server";
import { prisma } from "@/lib/prisma";

/**
 * Stock comes from the cached catalogue: checkout does not change stock, and admin product edits
 * revalidate that cache. Falls back to database products alone if the catalogue cannot load.
 */
async function lowStock() {
  try {
    return lowStockProducts((await getCatalogData()).products);
  } catch (error) {
    console.error("Admin overview catalog failed, using database products only:", error);
    return lowStockProducts(await prisma.product.findMany({ where: { stock: { lte: LOW_STOCK } }, select: { id: true, name: true, stock: true } }));
  }
}

export async function GET(request: NextRequest) {
  try {
    const denied = await authorizeAdmin(request);
    if (denied) return denied;
    const [orders, low] = await Promise.all([loadOrderOverview(), lowStock()]);
    return adminJson({ ...orders, lowStock: low } satisfies AdminOverview);
  } catch (error) {
    console.error("Admin overview failed:", error);
    return adminJson({ error: "โหลดภาพรวมไม่สำเร็จ กรุณาลองอีกครั้ง" }, 503);
  }
}
