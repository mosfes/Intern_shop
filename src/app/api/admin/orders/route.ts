import type { NextRequest } from "next/server";
import { withAdminActivity } from "@/lib/admin-activity";
import { adminJson, authorizeAdmin } from "@/lib/admin-auth";
import { OrderUpdateError, applyOrderUpdate, isOrderStatus, validateOrderUpdate, type AdminOrderList } from "@/lib/admin-orders";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { Order } from "@/lib/types";
import { randomUUID } from "node:crypto";
import { enqueueOrderEmail, sendOrderEmail } from "@/lib/order-email";
import { adjustDatabaseStock, finishStockAdjustment, type StockLine } from "@/lib/stock";

const PAGE_SIZE = 20;
// Only paid orders are fulfilled. Unpaid ones (a charge was created and is still waiting) are listed on their
// own tab and in the full list so admins can issue a purchase order; abandoned and failed checkouts are never listed.
const PAID = { status: "successful" } as const;
const UNPAID = { status: "pending", chargeId: { not: null } } as const;
const statusWhere = (status: string): Prisma.CheckoutPaymentWhereInput => ({ order: { path: "$.status", equals: status } });

async function searchWhere(query: string) {
  if (!query) return { where: {}, sql: Prisma.empty };
  const customers = await prisma.shopUser.findMany({
    where: { OR: [{ email: { contains: query } }, { name: { contains: query } }, { phone: { contains: query } }] },
    select: { googleId: true }, take: 200,
  });
  const where: Prisma.CheckoutPaymentWhereInput = { OR: [
    { order: { path: "$.id", string_contains: query.toUpperCase() } },
    { chargeId: { contains: query } },
    ...(customers.length ? [{ userId: { in: customers.map((customer) => customer.googleId) } }] : []),
  ] };
  const customerMatch = customers.length ? Prisma.sql`OR userId IN (${Prisma.join(customers.map((customer) => customer.googleId))})` : Prisma.empty;
  const sql = Prisma.sql`AND (JSON_UNQUOTE(JSON_EXTRACT(\`order\`, '$.id')) LIKE ${`%${query.toUpperCase()}%`}
    OR chargeId LIKE ${`%${query}%`} ${customerMatch})`;
  return { where, sql };
}

export async function GET(request: NextRequest) {
  try {
    const denied = await authorizeAdmin(request);
    if (denied) return denied;
    const params = request.nextUrl.searchParams;
    const page = Number(params.get("page") ?? "1");
    const status = params.get("status") || "all";
    const query = (params.get("q") ?? "").trim();
    if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || (status !== "all" && status !== "unpaid" && !isOrderStatus(status)) || query.length > 100) {
      return adminJson({ error: "ข้อมูลไม่ถูกต้อง" }, 400);
    }
    const search = await searchWhere(query);
    const base: Prisma.CheckoutPaymentWhereInput = { AND: [{ OR: [PAID, UNPAID] }, search.where] };
    const where: Prisma.CheckoutPaymentWhereInput = status === "all" ? base
      : status === "unpaid" ? { AND: [UNPAID, search.where] }
      : { AND: [PAID, search.where, statusWhere(status)] };
    const paymentsRequest = Promise.resolve(prisma.checkoutPayment.findMany({
      where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
      select: { id: true, chargeId: true, userId: true, amount: true, status: true, order: true, createdAt: true, updatedAt: true },
    }));
    // Scan the matching paid and unpaid orders once, rather than once for every status and total.
    // Customer details start as soon as this page is ready, while counts are still running.
    const [payments, statusCounts, users] = await Promise.all([
      paymentsRequest,
      prisma.$queryRaw<{ status: string | null; total: bigint | number }[]>(Prisma.sql`
        SELECT CASE WHEN status = 'pending' THEN 'unpaid' ELSE JSON_UNQUOTE(JSON_EXTRACT(\`order\`, '$.status')) END AS status, COUNT(*) AS total
        FROM CheckoutPayment WHERE (status = 'successful' OR (status = 'pending' AND chargeId IS NOT NULL)) ${search.sql}
        GROUP BY 1
      `),
      paymentsRequest.then((payments) => payments.length ? prisma.shopUser.findMany({
        where: { googleId: { in: [...new Set(payments.map((payment) => payment.userId))] } },
        select: { googleId: true, name: true, email: true, phone: true },
      }) : []),
    ]);
    const counts: AdminOrderList["counts"] = { all: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0, unpaid: 0 };
    for (const row of statusCounts) {
      const count = Number(row.total);
      counts.all += count;
      if (row.status === "unpaid") { counts.unpaid += count; continue; }
      if (isOrderStatus(row.status)) counts[row.status] += count;
    }
    const total = counts[status as keyof typeof counts];
    const userMap = new Map(users.map((user) => [user.googleId, user]));
    return adminJson({
      orders: payments.map((payment) => {
        const user = userMap.get(payment.userId);
        return {
          id: payment.id, chargeId: payment.chargeId, amount: payment.amount / 100, paid: payment.status === "successful",
          createdAt: payment.createdAt.toISOString(), updatedAt: payment.updatedAt.toISOString(),
          customer: { id: payment.userId, name: user?.name ?? null, email: user?.email ?? null, phone: user?.phone || null },
          order: payment.order as unknown as Order,
        };
      }),
      total, page, pageSize: PAGE_SIZE,
      counts,
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
    const previous = payment.order as unknown as Order;
    const statusChanged = (previous.status || "processing") !== order.status;
    const trackingChanged = (previous.trackingNumber || "") !== (order.trackingNumber || "");
    const emailId = (statusChanged || trackingChanged) && process.env.RESEND_API_KEY && process.env.RESEND_FROM ? `update/${randomUUID()}` : undefined;
    // Cancelling is final, so a paid order whose stock was taken puts it back exactly once, together with the status
    // change. Orders paid before stock was tracked have nothing to put back.
    const returnStock = order.status === "cancelled" && statusChanged && previous.stockTaken === true;
    if (returnStock) order.stockTaken = false;
    const save = (tx: Prisma.TransactionClient) => tx.checkoutPayment.updateMany({
      where: { id: payment.id, status: "successful", updatedAt: payment.updatedAt },
      data: { order: JSON.parse(JSON.stringify(order)) },
    });
    const pending: { external?: StockLine[] } = {};
    const saved = emailId || returnStock ? await prisma.$transaction(async (tx) => {
      const result = await save(tx);
      if (result.count) {
        if (emailId) await enqueueOrderEmail(tx, emailId, payment.userId, order, statusChanged ? "status" : "tracking", payment.chargeId);
        if (returnStock) pending.external = await adjustDatabaseStock(tx, previous.lines, "return");
      }
      return result;
    }) : await save(prisma);
    if (!saved.count) return adminJson({ error: "คำสั่งซื้อนี้ถูกแก้ไขไปแล้ว กรุณาโหลดข้อมูลใหม่" }, 409);
    if (pending.external) await finishStockAdjustment(pending.external, "return");
    if (emailId) await sendOrderEmail(emailId).catch(() => false);
    const row = await prisma.checkoutPayment.findUnique({ where: { id: payment.id }, select: { updatedAt: true } });
    return adminJson({ order, updatedAt: row?.updatedAt.toISOString() ?? null });
  } catch (error) {
    if (error instanceof OrderUpdateError) return adminJson({ error: error.message }, error.status);
    console.error("Admin order update failed:", error);
    return adminJson({ error: "บันทึกคำสั่งซื้อไม่สำเร็จ กรุณาลองอีกครั้ง" }, 503);
  }
}

export const PATCH = withAdminActivity("orders", handlePATCH);
