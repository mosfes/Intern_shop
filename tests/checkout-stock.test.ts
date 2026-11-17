import "dotenv/config";
import assert from "node:assert/strict";
import { after, afterEach, mock, test } from "node:test";
import { startCheckoutPayment } from "../src/lib/checkout-payment";
import { settleCharge } from "../src/lib/payment-settlement";
import { maintainStock } from "../src/lib/stock-maintenance";
import { GET } from "../src/app/api/internal/stock/route";
import { prisma } from "../src/lib/prisma";
import type { Order } from "../src/lib/types";
import { restoreStockStores, stockStore } from "./helpers/stock-store";

Object.assign(process.env, { MOCKAPI_BASE_URL: "https://mock.test", OMISE_SECRET_KEY: "skey_test_unit_test" });
delete process.env.RESEND_API_KEY;
afterEach(() => { restoreStockStores(); mock.restoreAll(); });
after(() => prisma.$disconnect());
const order: Order = { id: "checkout-1", createdAt: "2026-11-17T00:00:00Z", status: "processing", lines: [{ productId: "tidb_a", name: "A", image: "", price: 100, quantity: 1 }], subtotal: 100, shipping: 0, total: 100, shippingMethod: "pickup", paymentMethod: "card", address: "Bangkok" };
const params = { amount: "10000", currency: "THB", "metadata[checkoutId]": order.id, "metadata[userId]": "customer-1" };
const charge = { id: "chrg_one", status: "pending", paid: false, amount: 10000, currency: "thb", metadata: { checkoutId: order.id, userId: "customer-1" } };

test("a checkout must reserve before a bank request; the loser cannot charge", async () => {
  const store = stockStore({ tidb_a: 1 });
  let requests = 0;
  mock.method(globalThis, "fetch", async () => {
    assert.equal(store.reservations.filter((row) => row.state === "held").length, 1);
    requests++; return Response.json(charge);
  });
  const results = await Promise.allSettled([
    startCheckoutPayment("customer-1", order, params),
    startCheckoutPayment("customer-1", { ...order, id: "checkout-2" }, params),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(requests, 1);
  assert.equal(store.payments.length, 1);
  assert.equal(store.payments[0].chargeId, charge.id);
});

test("a definite bank validation error releases the reservation", async () => {
  const store = stockStore({ tidb_a: 1 });
  mock.method(globalThis, "fetch", async () => Response.json({ object: "error", code: "invalid_card", message: "Declined" }, { status: 400 }));
  await assert.rejects(startCheckoutPayment("customer-1", order, params), /Declined/);
  assert.equal(store.reservations[0].state, "released");
  assert.equal(store.payments[0].status, "failed");
  assert.equal(store.database.get("tidb_a"), 1);
});

test("a bank create timeout keeps the reservation until provider reconciliation", async () => {
  const store = stockStore({ tidb_a: 1 });
  mock.method(globalThis, "fetch", async () => { throw new Error("Timeout after provider may have charged"); });
  await assert.rejects(startCheckoutPayment("customer-1", order, params));
  assert.equal(store.reservations[0].state, "held");
  assert.equal(store.payments[0].status, "pending");
  assert.equal(store.payments[0].chargeId, null);
  // A subsequent genuine webhook still finds the checkout by metadata and settles normally.
  await settleCharge({ ...charge, status: "successful", paid: true, authorize_uri: null, failure_code: null, failure_message: null, expires_at: null });
  assert.equal(store.database.get("tidb_a"), 0);
  assert.equal(store.reservations[0].state, "consumed");
});

test("maintenance releases a missed expired payment without customer visits", async () => {
  const store = stockStore({ tidb_a: 1 });
  let expired = false;
  mock.method(globalThis, "fetch", async () => Response.json({ ...charge, status: expired ? "expired" : "pending" }));
  await startCheckoutPayment("customer-1", order, params);
  expired = true;
  const result = await maintainStock();
  assert.equal(result.reconciled, 1);
  assert.equal(store.reservations[0].state, "released");
  assert.equal(store.payments[0].status, "failed");
});

test("maintenance reports unlinked checkouts but never frees uncertain payments by time alone", async () => {
  const store = stockStore({ tidb_a: 1 });
  mock.method(globalThis, "fetch", async () => { throw new Error("Timeout"); });
  await assert.rejects(startCheckoutPayment("customer-1", order, params));
  store.payments[0].createdAt = new Date(Date.now() - 60 * 60_000);
  const result = await maintainStock();
  assert.equal(result.unlinked, 1);
  assert.equal(store.reservations[0].state, "held");
});

test("stock maintenance endpoint requires the configured scheduler secret", async () => {
  const previous = process.env.CRON_SECRET;
  try {
    delete process.env.CRON_SECRET;
    assert.equal((await GET(new Request("https://shop.test/api/internal/stock"))).status, 401);
    process.env.CRON_SECRET = "test-secret";
    assert.equal((await GET(new Request("https://shop.test/api/internal/stock", { headers: { authorization: "Bearer forged" } }))).status, 401);
    stockStore();
    assert.equal((await GET(new Request("https://shop.test/api/internal/stock", { headers: { authorization: "Bearer test-secret" } }))).status, 200);
  } finally { if (previous === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previous; }
});
