import type { NextRequest } from "next/server";
import { withAdminActivity } from "@/lib/admin-activity";
import { adminJson, authorizeAdmin } from "@/lib/admin-auth";
import { ORDER_STATUSES, OrderUpdateError, applyOrderUpdate, isOrderStatus, validateOrderUpdate, type AdminOrderList } from "@/lib/admin-orders";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { Order } from "@/lib/types";

const PAGE_SIZE = 20;
// Only paid orders are fulfilled; pending and failed payments stay in the customer's shopping view.
const PAID = { status: "successful" } as const;
const statusWhere = (status: string): Prisma.CheckoutPaymentWhereInput => ({ order: { path: "$.status", equals: status } });

async function searchWhere(query: string): Promise<Prisma.CheckoutPaymentWhereInput> {
  if (!query) return {};
  const customers = await prisma.shopUser.findMany({
    where: { OR: [{ email: { contains: query } }, { name: { contains: query } }, { phone: { contains: query } }] },
    select: { googleId: true }, take: 200,
  });
  return { OR: [
    { order: { path: "$.id", string_contains: query.toUpperCase() } },
    { chargeId: { contains: query } },
    ...(customers.length ? [{ userId: { in: customers.map((customer) => customer.googleId) } }] : []),
  ] };
}

export async function GET(request: NextRequest) {
  try {
    const denied = await authorizeAdmin(request);
    if (denied) return denied;
    const params = request.nextUrl.searchParams;
    const page = Number(params.get("page") ?? "1");
    const status = params.get("status") || "all";
    const query = (params.get("q") ?? "").trim();
    if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || (status !== "all" && !isOrderStatus(status)) || query.length > 100) {
      return adminJson({ error: "ข้อมูลไม่ถูกต้อง" }, 400);
    }
    const search = await searchWhere(query);
    const base: Prisma.CheckoutPaymentWhereInput = { AND: [PAID, search] };
    const where: Prisma.CheckoutPaymentWhereInput = status === "all" ? base : { AND: [PAID, search, statusWhere(status)] };
    const [payments, total, all, ...byStatus] = await Promise.all([
      prisma.checkoutPayment.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
      prisma.checkoutPayment.count({ where }),
      prisma.checkoutPayment.count({ where: base }),
      ...ORDER_STATUSES.map((value) => prisma.checkoutPayment.count({ where: { AND: [PAID, search, statusWhere(value)] } })),
    ]);
    const users = await prisma.shopUser.findMany({ where: { googleId: { in: [...new Set(payments.map((payment) => payment.userId))] } }, select: { googleId: true, name: true, email: true, phone: true } });
    const userMap = new Map(users.map((user) => [user.googleId, user]));
    return adminJson({
      orders: payments.map((payment) => {
        const user = userMap.get(payment.userId);
        return {
          id: payment.id, chargeId: payment.chargeId, amount: payment.amount / 100,
          createdAt: payment.createdAt.toISOString(), updatedAt: payment.updatedAt.toISOString(),
          customer: { id: payment.userId, name: user?.name ?? null, email: user?.email ?? null, phone: user?.phone || null },
          order: payment.order as unknown as Order,
        };
      }),
      total, page, pageSize: PAGE_SIZE,
      counts: { all, ...Object.fromEntries(ORDER_STATUSES.map((value, index) => [value, byStatus[index]])) } as AdminOrderList["counts"],
    } satisfies AdminOrderList);
  } catch (error) {
    console.error("Admin order list failed:", error);
    return adminJson({ error: "โหลดคำสั่งซื้อไม่สำเร็จ กรุณาลองอีกครั้ง" }, 503);
  }
}

/** PATCH { id, status, trackingNumber?, adminNote?, updatedAt } changes a paid order's fulfilment. */
async function handlePATCH(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    const value = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) return adminJson({ error: "ข้อมูลไม่ถูกต้อง" }, 400);
    body = value;
  } catch { return adminJson({ error: "ข้อมูลไม่ถูกต้อง" }, 400); }
  try {
    const update = validateOrderUpdate(body);
    const payment = await prisma.checkoutPayment.findUnique({ where: { id: update.id } });
    if (!payment || payment.status !== "successful") return adminJson({ error: "ไม่พบคำสั่งซื้อที่ชำระเงินแล้ว" }, 404);
    // Another admin may have changed it since this one opened the order.
    if (typeof body.updatedAt === "string" && body.updatedAt !== payment.updatedAt.toISOString()) {
      return adminJson({ error: "คำสั่งซื้อนี้ถูกแก้ไขไปแล้ว กรุณาโหลดข้อมูลใหม่" }, 409);
    }
    const order = applyOrderUpdate(payment.order as unknown as Order, update);
    const saved = await prisma.checkoutPayment.updateMany({
      where: { id: payment.id, status: "successful", updatedAt: payment.updatedAt },
      data: { order: JSON.parse(JSON.stringify(order)) },
    });
    if (!saved.count) return adminJson({ error: "คำสั่งซื้อนี้ถูกแก้ไขไปแล้ว กรุณาโหลดข้อมูลใหม่" }, 409);
    const row = await prisma.checkoutPayment.findUnique({ where: { id: payment.id }, select: { updatedAt: true } });
    return adminJson({ order, updatedAt: row?.updatedAt.toISOString() ?? null });
  } catch (error) {
    if (error instanceof OrderUpdateError) return adminJson({ error: error.message }, error.status);
    console.error("Admin order update failed:", error);
    return adminJson({ error: "บันทึกคำสั่งซื้อไม่สำเร็จ กรุณาลองอีกครั้ง" }, 503);
  }
}

export const PATCH = withAdminActivity("orders", handlePATCH);
