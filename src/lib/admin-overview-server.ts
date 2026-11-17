import { buildOverview, overviewBoundaries, type DailyRow, type OrderRow, type StatusRow } from "./admin-overview";
import { prisma } from "./prisma";

// Orders saved before statuses existed have no $.status; they are treated as "processing".
const STATUS = "COALESCE(JSON_UNQUOTE(JSON_EXTRACT(`order`, '$.status')), 'processing')";
const ORDER_FIELDS = { id: true, amount: true, createdAt: true, order: true } as const;

/**
 * Order figures for the admin overview. Totals and the daily trend are summed by the database
 * (CheckoutPayment_status_createdAt_idx); only orders whose lines are needed are loaded.
 */
export async function loadOrderOverview(now = new Date()) {
  const at = overviewBoundaries(now);
  const [statusRows, dailyRows, topOrders, recent] = await Promise.all([
    prisma.$queryRawUnsafe<StatusRow[]>(
      `SELECT ${STATUS} AS status, COUNT(*) AS orders, SUM(amount) AS amount,
         SUM(createdAt >= ?) AS todayOrders, SUM(IF(createdAt >= ?, amount, 0)) AS todayAmount,
         SUM(createdAt >= ?) AS monthOrders, SUM(IF(createdAt >= ?, amount, 0)) AS monthAmount,
         SUM(IF(createdAt >= ? AND createdAt < ?, amount, 0)) AS lastMonthAmount
       FROM CheckoutPayment WHERE status = 'successful' GROUP BY 1`,
      at.today, at.today, at.month, at.month, at.lastMonth, at.month,
    ),
    prisma.$queryRawUnsafe<DailyRow[]>(
      `SELECT DATE_FORMAT(DATE_ADD(createdAt, INTERVAL 7 HOUR), '%Y-%m-%d') AS day, COUNT(*) AS orders, SUM(amount) AS amount
       FROM CheckoutPayment WHERE status = 'successful' AND createdAt >= ? AND ${STATUS} <> 'cancelled' GROUP BY 1`,
      at.trend,
    ),
    prisma.checkoutPayment.findMany({ where: { status: "successful", createdAt: { gte: at.topProducts } }, select: ORDER_FIELDS }),
    prisma.checkoutPayment.findMany({ where: { status: "successful" }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 5, select: ORDER_FIELDS }),
  ]);
  return buildOverview({ statusRows, dailyRows, topOrders: topOrders as unknown as OrderRow[], recent: recent as unknown as OrderRow[] }, now);
}
