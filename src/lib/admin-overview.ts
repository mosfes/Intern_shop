import { isOrderStatus } from "./admin-orders";
import type { Order, OrderStatus } from "./types";

/** The shop reports days in Thai time (UTC+7, no daylight saving). */
const OFFSET = 7 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
export const TREND_DAYS = 14;
/** Best sellers are counted over this many days so the query stays bounded as orders grow. */
export const TOP_PRODUCT_DAYS = 30;
export const LOW_STOCK = 5;

export type AdminOverview = {
  revenue: { today: number; month: number; lastMonth: number; total: number };
  orders: { today: number; month: number; total: number; averageValue: number; byStatus: Record<OrderStatus, number> };
  /** Last TREND_DAYS days in Thai time, oldest first. */
  daily: { date: string; revenue: number; orders: number }[];
  topProducts: { productId: string; name: string; image: string; quantity: number; revenue: number }[];
  recentOrders: { id: string; orderId: string; createdAt: string; total: number; status: OrderStatus; items: number }[];
  lowStock: { id: string; name: string; stock: number }[];
};

const dayKey = (time: number) => new Date(time + OFFSET).toISOString().slice(0, 10);
const startOfThaiDay = (key: string) => new Date(Date.parse(`${key}T00:00:00.000Z`) - OFFSET);

/** UTC instants where the reporting periods start, for SQL range filters. */
export function overviewBoundaries(now = new Date()) {
  const today = dayKey(now.getTime());
  const [year, month] = today.split("-").map(Number);
  const monthKey = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}-01`;
  return {
    today: startOfThaiDay(today),
    month: startOfThaiDay(monthKey(year, month)),
    lastMonth: startOfThaiDay(month === 1 ? monthKey(year - 1, 12) : monthKey(year, month - 1)),
    trend: startOfThaiDay(dayKey(now.getTime() - (TREND_DAYS - 1) * DAY)),
    topProducts: new Date(now.getTime() - TOP_PRODUCT_DAYS * DAY),
  };
}

/** One row per order status (raw SQL; numbers may arrive as bigint or decimal strings). `amount` is satang. */
export type StatusRow = { status: string | null; orders: unknown; amount: unknown; todayOrders: unknown; todayAmount: unknown; monthOrders: unknown; monthAmount: unknown; lastMonthAmount: unknown };
/** Non-cancelled paid orders per Thai day. */
export type DailyRow = { day: string | Date; orders: unknown; amount: unknown };
export type OrderRow = { id: string; amount: number; createdAt: Date; order: Order };

const num = (value: unknown) => Number(value ?? 0) || 0;
const statusOf = (value: unknown): OrderStatus => (isOrderStatus(value) ? value : "processing");
const dayOf = (value: string | Date) => (value instanceof Date ? value.toISOString() : String(value)).slice(0, 10);

export function buildOverview(
  { statusRows, dailyRows, topOrders, recent }: { statusRows: StatusRow[]; dailyRows: DailyRow[]; topOrders: OrderRow[]; recent: OrderRow[] },
  now = new Date(),
): Omit<AdminOverview, "lowStock"> {
  const byStatus: Record<OrderStatus, number> = { processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
  const revenue = { today: 0, month: 0, lastMonth: 0, total: 0 };
  const orders = { today: 0, month: 0, total: 0 };
  let paidOrders = 0;
  for (const row of statusRows) {
    const status = statusOf(row.status);
    byStatus[status] += num(row.orders);
    orders.total += num(row.orders);
    orders.today += num(row.todayOrders);
    orders.month += num(row.monthOrders);
    // Cancelled orders are refunded, so they count by status but not as revenue.
    if (status === "cancelled") continue;
    paidOrders += num(row.orders);
    revenue.total += num(row.amount) / 100;
    revenue.today += num(row.todayAmount) / 100;
    revenue.month += num(row.monthAmount) / 100;
    revenue.lastMonth += num(row.lastMonthAmount) / 100;
  }

  const byDay = new Map(dailyRows.map((row) => [dayOf(row.day), row]));
  const daily = Array.from({ length: TREND_DAYS }, (_, index) => {
    const date = dayKey(now.getTime() - (TREND_DAYS - 1 - index) * DAY);
    const row = byDay.get(date);
    return { date, revenue: num(row?.amount) / 100, orders: num(row?.orders) };
  });

  const products = new Map<string, AdminOverview["topProducts"][number]>();
  for (const payment of topOrders) {
    if (statusOf(payment.order?.status) === "cancelled") continue;
    for (const line of payment.order?.lines ?? []) {
      const entry = products.get(line.productId) ?? { productId: line.productId, name: line.name, image: line.image, quantity: 0, revenue: 0 };
      entry.quantity += line.quantity;
      entry.revenue += line.price * line.quantity;
      products.set(line.productId, entry);
    }
  }

  return {
    revenue,
    orders: { ...orders, averageValue: paidOrders ? revenue.total / paidOrders : 0, byStatus },
    daily,
    topProducts: [...products.values()].sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue).slice(0, 5),
    recentOrders: recent.map((payment) => ({
      id: payment.id, orderId: payment.order?.id ?? payment.id, createdAt: payment.createdAt.toISOString(), total: payment.amount / 100,
      status: statusOf(payment.order?.status),
      items: (payment.order?.lines ?? []).reduce((sum, line) => sum + line.quantity, 0),
    })),
  };
}

/** Products at or under LOW_STOCK, emptiest first. */
export function lowStockProducts(products: { id: string; name: string; stock?: number }[], limit = 6) {
  return products
    .map(({ id, name, stock }) => ({ id: String(id), name, stock: Number(stock) || 0 }))
    .filter((product) => product.stock <= LOW_STOCK)
    .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name, "th"))
    .slice(0, limit);
}
