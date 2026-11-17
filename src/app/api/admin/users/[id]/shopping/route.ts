import type { NextRequest } from "next/server";
import { adminJson as json, authorizeAdmin } from "@/lib/admin-auth";
import { CatalogApiError, getStoredProduct } from "@/lib/admin-products";
import { prisma } from "@/lib/prisma";
import type { Order } from "@/lib/types";
import type { CustomerShopping } from "@/lib/admin-customer-shopping";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const denied = await authorizeAdmin(request);
    if (denied) return denied;
    const { id } = await params;
    const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
    if (!id || id.length > 191 || !Number.isSafeInteger(page) || page < 1 || page > 1000000) return json({ error: "ข้อมูลไม่ถูกต้อง" }, 400);
    const user = await prisma.shopUser.findUnique({ where: { googleId: id }, select: { email: true } });
    if (!user) return json({ error: "ไม่พบบัญชีลูกค้า" }, 404);
    if ((await prisma.adminCredential.findUnique({ where: { email: user.email }, select: { active: true } }))?.active) return json({ error: "ดูข้อมูลได้เฉพาะบัญชีลูกค้า" }, 400);
    const pageSize = 20;
    const [cart, payments, totalOrders] = await Promise.all([
      prisma.cartItem.findMany({ where: { userId: id }, orderBy: [{ updatedAt: "desc" }, { productId: "asc" }] }),
      prisma.checkoutPayment.findMany({ where: { userId: id }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize }),
      prisma.checkoutPayment.count({ where: { userId: id } }),
    ]);
    const lines = await Promise.all(cart.map(async (line) => {
      const base = { productId: line.productId, quantity: line.quantity, selected: line.selected, updatedAt: line.updatedAt.toISOString() };
      try {
        const product = await getStoredProduct(line.productId);
        return { ...base, name: product.name, slug: product.slug, image: product.images[0] || null, price: product.price, availability: "available" as const };
      } catch (error) {
        return { ...base, name: null, slug: null, image: null, price: null, availability: error instanceof CatalogApiError && error.status === 404 ? "removed" as const : "unavailable" as const };
      }
    }));
    return json({
      cart: lines,
      orders: payments.map((payment) => ({ id: payment.id, chargeId: payment.chargeId, status: payment.status, amount: payment.amount / 100, createdAt: payment.createdAt.toISOString(), order: payment.order as unknown as Order })),
      page, pageSize, totalOrders,
    } satisfies CustomerShopping);
  } catch { return json({ error: "โหลดตะกร้าและคำสั่งซื้อไม่สำเร็จ กรุณาลองอีกครั้ง" }, 503); }
}
