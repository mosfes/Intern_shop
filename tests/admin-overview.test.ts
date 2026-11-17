import assert from "node:assert/strict";
import { test } from "node:test";
import { buildOverview, lowStockProducts, overviewBoundaries, TREND_DAYS, type OrderRow } from "../src/lib/admin-overview";
import type { Order, OrderStatus } from "../src/lib/types";

const order = (status: OrderStatus, productId = "gpu", quantity = 1, price = 1000): Order => ({
  id: `CB${status}`, createdAt: "", status, lines: [{ productId, name: productId.toUpperCase(), image: "", price, quantity }],
  subtotal: price * quantity, shipping: 0, total: price * quantity, shippingMethod: "", paymentMethod: "", address: "",
});
const row = (id: string, iso: string, baht: number, value: Order): OrderRow => ({ id, amount: baht * 100, createdAt: new Date(iso), order: value });

test("period boundaries start at Bangkok midnight", () => {
  const at = overviewBoundaries(new Date("2026-01-01T18:30:00.000Z")); // 01:30 on 2 Jan in Bangkok
  assert.equal(at.today.toISOString(), "2026-01-01T17:00:00.000Z");
  assert.equal(at.month.toISOString(), "2025-12-31T17:00:00.000Z");
  assert.equal(at.lastMonth.toISOString(), "2025-11-30T17:00:00.000Z");
  assert.equal(at.trend.toISOString(), "2025-12-19T17:00:00.000Z");
});

test("builds totals from SQL rows and leaves cancelled orders out of revenue", () => {
  const now = new Date("2026-11-17T05:00:00.000Z");
  const summary = buildOverview({
    // MySQL returns COUNT as bigint and SUM as a decimal string.
    statusRows: [
      { status: "processing", orders: BigInt(2), amount: "300000", todayOrders: BigInt(1), todayAmount: "100000", monthOrders: BigInt(2), monthAmount: "300000", lastMonthAmount: "0" },
      { status: "shipped", orders: BigInt(1), amount: "200000", todayOrders: BigInt(0), todayAmount: "0", monthOrders: BigInt(0), monthAmount: "0", lastMonthAmount: "200000" },
      { status: "cancelled", orders: BigInt(1), amount: "999900", todayOrders: BigInt(1), todayAmount: "999900", monthOrders: BigInt(1), monthAmount: "999900", lastMonthAmount: "0" },
      { status: null, orders: BigInt(1), amount: "50000", todayOrders: BigInt(0), todayAmount: "0", monthOrders: BigInt(0), monthAmount: "0", lastMonthAmount: "0" },
    ],
    dailyRows: [{ day: "2026-11-17", orders: BigInt(1), amount: "100000" }, { day: "2026-11-01", orders: BigInt(9), amount: "1" }],
    topOrders: [
      row("a", "2026-11-17T01:00:00.000Z", 1000, order("processing")),
      row("b", "2026-11-10T03:00:00.000Z", 3000, order("delivered", "cpu", 2, 1500)),
      row("c", "2026-11-17T02:00:00.000Z", 9999, order("cancelled", "ram", 10)),
      row("d", "2026-11-05T03:00:00.000Z", 2000, order("shipped", "gpu", 2, 1000)),
    ],
    recent: [row("c", "2026-11-17T02:00:00.000Z", 9999, order("cancelled"))],
  }, now);

  assert.deepEqual(summary.revenue, { today: 1000, month: 3000, lastMonth: 2000, total: 5500 });
  assert.deepEqual({ today: summary.orders.today, month: summary.orders.month, total: summary.orders.total }, { today: 2, month: 3, total: 5 });
  assert.equal(summary.orders.averageValue, 5500 / 4);
  assert.deepEqual(summary.orders.byStatus, { processing: 3, shipped: 1, delivered: 0, cancelled: 1 });
  assert.equal(summary.daily.length, TREND_DAYS);
  assert.deepEqual(summary.daily.at(-1), { date: "2026-11-17", revenue: 1000, orders: 1 });
  assert.equal(summary.daily[0].date, "2026-11-04");
  assert.deepEqual(summary.topProducts.map((product) => [product.productId, product.quantity]), [["gpu", 3], ["cpu", 2]]);
  assert.deepEqual(summary.recentOrders.map((recent) => [recent.id, recent.status, recent.total]), [["c", "cancelled", 9999]]);
});

test("lists the emptiest products first", () => {
  assert.deepEqual(lowStockProducts([{ id: "a", name: "A", stock: 4 }, { id: "b", name: "B", stock: 20 }, { id: "c", name: "C" }, { id: "d", name: "D", stock: 0 }]).map((product) => product.id), ["c", "d", "a"]);
});
