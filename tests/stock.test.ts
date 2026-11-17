import "dotenv/config";
import assert from "node:assert/strict";
import { after, afterEach, mock, test } from "node:test";
import { NextRequest } from "next/server";
import { PATCH } from "../src/app/api/admin/orders/route";
import { customerOrder } from "../src/lib/admin-orders";
import { updateStoredProductStock } from "../src/lib/admin-products";
import { SESSION_COOKIE, signAuthToken } from "../src/lib/google-auth";
import type { OmiseCharge } from "../src/lib/omise";
import { settleCharge } from "../src/lib/payment-settlement";
import { prisma } from "../src/lib/prisma";
import { adjustDatabaseStock, applyNextStockMovement, reserveCheckoutStock, retryStockMovements } from "../src/lib/stock";
import { stockTransaction } from "../src/lib/stock-coordination";
import type { Order } from "../src/lib/types";
import { restoreStockStores, stockStore, stubStockMethod } from "./helpers/stock-store";

Object.assign(process.env, { GOOGLE_CLIENT_ID: "test", GOOGLE_CLIENT_SECRET: "test", AUTH_SECRET: "test-session-secret-at-least-32-characters", AUTH_URL: "http://localhost:3000", MOCKAPI_BASE_URL: "https://mock.test" });
delete process.env.RESEND_API_KEY;
afterEach(() => { restoreStockStores(); mock.restoreAll(); });
after(() => prisma.$disconnect());

const lines = [
  { productId: "tidb_a", name: "A", image: "", price: 50, quantity: 2 },
  { productId: "remote-b", name: "B", image: "", price: 100, quantity: 3 },
];
const order = (id: string, input = lines): Order => ({ id, createdAt: "2026-11-17T00:00:00Z", status: "processing", lines: input, subtotal: 400, shipping: 0, total: 400, shippingMethod: "pickup", paymentMethod: "card", address: "Bangkok" });
const charge = (id = "checkout-stock"): OmiseCharge => ({ id: `chrg_${id}`, status: "successful", paid: true, amount: 40000, currency: "thb", authorize_uri: null, failure_code: null, failure_message: null, expires_at: null, metadata: { userId: "customer-1", checkoutId: id } });
async function checkout(id = "checkout-stock", input = lines, reserve = true) {
  await stockTransaction(async (tx) => {
    await tx.checkoutPayment.create({ data: { id, userId: "customer-1", amount: 40000, order: JSON.parse(JSON.stringify(order(id, input))) } });
    if (reserve) await reserveCheckoutStock(tx, id, input);
  });
}
function admin() {
  stubStockMethod(prisma.shopUser, "findUnique", async () => ({ googleId: "admin", email: "admin@example.com", name: "Admin", phone: "", disabled: false }));
  stubStockMethod(prisma.adminCredential, "findUnique", async () => ({ active: true, version: 1 }));
  stubStockMethod(prisma.adminActivityLog, "create", async () => ({ id: "log" }));
  stubStockMethod(prisma.adminActivityLog, "update", async () => ({}));
}
async function cancel(id: string, updatedAt?: Date, status = "cancelled") {
  return PATCH(new NextRequest("http://localhost:3000/api/admin/orders", {
    method: "PATCH", headers: { cookie: `${SESSION_COOKIE}=${await signAuthToken({ sub: "admin", email: "admin@example.com", name: "Admin" }, "session", 60)}`, origin: "http://localhost:3000", "Content-Type": "application/json" },
    body: JSON.stringify({ id, status, ...(updatedAt ? { updatedAt: updatedAt.toISOString() } : {}) }),
  }));
}

test("successful payment takes mixed stock once despite concurrent and late events", async () => {
  const store = stockStore({ tidb_a: 10, "remote-b": 8 });
  await checkout();
  assert.equal(store.database.get("tidb_a"), 10);
  assert.equal(store.remote.get("remote-b")!.stock, 8);
  await Promise.all([settleCharge(charge()), settleCharge(charge())]);
  await settleCharge({ ...charge(), status: "failed", paid: false });
  assert.equal(store.database.get("tidb_a"), 8);
  assert.equal(store.remote.get("remote-b")!.stock, 5);
  assert.equal(store.payments[0].order.stockTaken, true);
  assert.equal(store.movements.length, 1);
  assert.equal(store.calls.filter((call) => call.method === "PUT").length, 1);
  assert.ok(store.locks.some((sql) => sql.includes("StockLock") && sql.includes("FOR UPDATE")));
});

test("concurrent checkouts cannot both reserve the last item", async () => {
  const store = stockStore({ "remote-b": 1 });
  const one = [{ ...lines[1], quantity: 1 }];
  const outcomes = await Promise.allSettled([checkout("one", one), checkout("two", one)]);
  assert.equal(outcomes.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(store.reservations.length, 1);
  assert.equal(store.payments.length, 1, "losing checkout rolls back its snapshot");
  await settleCharge(charge(store.payments[0].id));
  assert.equal(store.remote.get("remote-b")!.stock, 0);
});

test("multi-item shortage rolls back the entire reservation", async () => {
  const store = stockStore({ tidb_a: 10, "remote-b": 2 });
  await assert.rejects(checkout(), /สินค้าไม่พอ/);
  assert.equal(store.reservations.length, 0);
  assert.equal(store.payments.length, 0);
  assert.equal(store.database.get("tidb_a"), 10);
});

test("TiDB also refuses a second reservation against held stock", async () => {
  const store = stockStore({ tidb_a: 2 });
  await checkout("one", [lines[0]]);
  await assert.rejects(checkout("two", [lines[0]]), /สินค้าไม่พอ/);
  assert.equal(store.reservations.length, 1);
});

test("pending payments retain reservations; definite failure or expiry releases them once", async () => {
  for (const status of ["failed", "expired", "reversed"]) {
    const store = stockStore({ tidb_a: 2 });
    await checkout("one", [lines[0]]);
    await settleCharge({ ...charge("one"), status: "pending", paid: false });
    await assert.rejects(checkout("blocked", [lines[0]]));
    await settleCharge({ ...charge("one"), status, paid: false });
    await settleCharge({ ...charge("one"), status: "pending", paid: false });
    assert.equal(store.reservations[0].state, "released");
    await checkout("two", [lines[0]]);
    assert.equal(store.database.get("tidb_a"), 2);
    restoreStockStores(); mock.restoreAll();
  }
});

test("remote concurrent sales deduct both quantities without a lost update", async () => {
  const store = stockStore({ "remote-b": 10 });
  const one = [{ ...lines[1], quantity: 1 }];
  await checkout("one", one); await checkout("two", one);
  await Promise.all([settleCharge(charge("one")), settleCharge(charge("two")), retryStockMovements()]);
  await retryStockMovements();
  assert.equal(store.remote.get("remote-b")!.stock, 8);
  assert.equal(store.movements.filter((job) => job.state === "applied").length, 2);
});

test("MockAPI outage after payment queues the deduction without losing the paid order", async () => {
  const store = stockStore({ tidb_a: 10, "remote-b": 8 });
  await checkout(); store.failing = true;
  await settleCharge(charge());
  assert.equal(store.payments[0].status, "successful");
  assert.equal(store.database.get("tidb_a"), 8);
  assert.equal(store.movements[0].state, "pending");
  assert.equal(store.remote.get("remote-b")!.stock, 8);
  store.failing = false;
  await retryStockMovements();
  assert.equal(store.remote.get("remote-b")!.stock, 5);
});

test("a cancelled failed deduction is taken then returned, never inventing stock", async () => {
  const store = stockStore({ tidb_a: 10, "remote-b": 8 }); admin();
  await checkout(); store.failing = true;
  await settleCharge(charge());
  assert.equal((await cancel("checkout-stock")).status, 200);
  assert.equal(store.remote.get("remote-b")!.stock, 8);
  assert.deepEqual(store.movements.map((job) => job.direction), ["take", "return"]);
  store.failing = false;
  await retryStockMovements();
  assert.equal(store.remote.get("remote-b")!.stock, 8);
  assert.equal(store.database.get("tidb_a"), 10);
  assert.ok(store.movements.every((job) => job.state === "applied"));
  assert.equal((await cancel("checkout-stock")).status, 200);
  assert.equal(store.movements.length, 2);
});

test("a lost PUT response is retried using its receipt, with no second deduction", async () => {
  const store = stockStore({ "remote-b": 8 });
  await checkout("one", [lines[1]]); store.losePutResponse = true;
  await settleCharge(charge("one"));
  assert.equal(store.remote.get("remote-b")!.stock, 5);
  assert.equal(store.movements[0].state, "uncertain");
  await retryStockMovements();
  assert.equal(store.remote.get("remote-b")!.stock, 5);
  assert.equal(store.movements[0].state, "applied");
  assert.equal(store.calls.filter((call) => call.method === "PUT").length, 1);
});

test("a worker commit failure is recovered from the remote receipt", async () => {
  const store = stockStore({ "remote-b": 8 });
  await checkout("one", [lines[1]]); store.failing = true;
  await settleCharge(charge("one")); store.failing = false; store.failCommit = true;
  assert.equal(await applyNextStockMovement("remote-b"), false);
  assert.equal(store.remote.get("remote-b")!.stock, 5);
  await retryStockMovements();
  assert.equal(store.remote.get("remote-b")!.stock, 5);
  assert.equal(store.movements[0].state, "applied");
});

test("unapplied paid sales consume availability for the next checkout", async () => {
  const store = stockStore({ "remote-b": 3 });
  await checkout("one", [lines[1]]); store.failing = true;
  await settleCharge(charge("one")); store.failing = false;
  await assert.rejects(checkout("two", [{ ...lines[1], quantity: 1 }]), /สินค้าไม่พอ/);
});

test("MockAPI must support receipts before accepting a new payment", async () => {
  const store = stockStore({ "remote-b": 8 });
  delete (store.remote.get("remote-b") as Partial<{ stockOperationId: string }>).stockOperationId;
  await assert.rejects(checkout("one", [lines[1]]), /ยังไม่พร้อม/);
  assert.equal(store.payments.length, 0);
});

test("a missing receipt after PUT stops automatic replay and blocks later returns", async () => {
  const store = stockStore({ "remote-b": 8 }); admin();
  await checkout("one", [lines[1]]); store.omitReceipt = true;
  await settleCharge(charge("one"));
  assert.equal(store.movements[0].state, "review");
  assert.equal((await cancel("one")).status, 200);
  await retryStockMovements();
  assert.equal(store.remote.get("remote-b")!.stock, 5);
  assert.equal(store.movements[1].state, "pending");
  assert.equal(store.calls.filter((call) => call.method === "PUT").length, 1);
});

test("legacy shortage records the payment for review without negative stock or partial deduction", async () => {
  const store = stockStore({ tidb_a: 1, "remote-b": 8 }); admin();
  await checkout("legacy", lines, false);
  await settleCharge(charge("legacy"));
  assert.equal(store.payments[0].status, "successful");
  assert.equal(store.payments[0].order.stockTaken, false);
  assert.ok(store.payments[0].order.stockIssue);
  assert.equal(store.database.get("tidb_a"), 1);
  assert.equal(store.movements.length, 0);
  assert.equal((await cancel("legacy", undefined, "shipped")).status, 409);
  store.database.set("tidb_a", 10);
  await settleCharge(charge("legacy"));
  assert.equal(store.payments[0].order.stockIssue, undefined);
  assert.equal(store.database.get("tidb_a"), 8);
  assert.equal(store.remote.get("remote-b")!.stock, 5);
});

test("admin stock edits cannot overwrite stale balances or stock promised to a checkout", async () => {
  const store = stockStore({ tidb_a: 10, "remote-b": 8 });
  await checkout();
  await assert.rejects(updateStoredProductStock("tidb_a", 1, 10), /มีการจอง/);
  await assert.rejects(updateStoredProductStock("remote-b", 2, 8), /มีการจอง/);
  await settleCharge(charge());
  await assert.rejects(updateStoredProductStock("tidb_a", 10, 10), /Stock changed/);
  await assert.rejects(updateStoredProductStock("remote-b", 8, 8), /Stock changed/);
  assert.equal(store.database.get("tidb_a"), 8);
  assert.equal(store.remote.get("remote-b")!.stock, 5);
});

test("admin changes cannot overtake queued MockAPI movements", async () => {
  const store = stockStore({ "remote-b": 8 });
  await checkout("one", [lines[1]]); store.failing = true;
  await settleCharge(charge("one")); store.failing = false;
  await assert.rejects(updateStoredProductStock("remote-b", 10, 8), /กำลังรอปรับ/);
});

test("invalid quantities cannot move stock and internal flags stay hidden", async () => {
  const store = stockStore({ tidb_a: 5 });
  await stockTransaction((tx) => adjustDatabaseStock(tx, [{ productId: "tidb_a" }, { productId: "tidb_a", quantity: 0 }, { productId: "tidb_a", quantity: 1.5 }], "take", "invalid"));
  assert.equal(store.database.get("tidb_a"), 5);
  const visible = customerOrder({ ...order("one"), stockTaken: true, stockIssue: "internal", adminNote: "internal" });
  assert.equal(visible.stockTaken, undefined); assert.equal(visible.stockIssue, undefined); assert.equal(visible.adminNote, undefined);
});

test("a stale cancel cannot return stock", async () => {
  const store = stockStore({ tidb_a: 10, "remote-b": 8 }); admin();
  await checkout(); const stale = store.payments[0].updatedAt;
  await settleCharge(charge());
  assert.equal((await cancel("checkout-stock", stale)).status, 409);
  assert.equal(store.database.get("tidb_a"), 8);
  assert.equal(store.remote.get("remote-b")!.stock, 5);
});

test("a delayed PUT cannot be replayed or overtaken by a return", async () => {
  const store = stockStore({ "remote-b": 8 }); admin();
  await checkout("one", [lines[1]]); store.delayPut = true;
  await settleCharge(charge("one"));
  assert.equal(store.movements[0].state, "uncertain");
  assert.equal(store.remote.get("remote-b")!.stock, 8);
  assert.equal((await cancel("one")).status, 200);
  await retryStockMovements();
  assert.equal(store.calls.filter((call) => call.method === "PUT").length, 1);
  assert.equal(store.movements[1].state, "pending");
  store.completeDelayedPut();
  await retryStockMovements();
  assert.equal(store.remote.get("remote-b")!.stock, 8);
  assert.ok(store.movements.every((job) => job.state === "applied"));
});

test("cancelling an old paid order without stock tracking never invents stock", async () => {
  const store = stockStore({ tidb_a: 10, "remote-b": 8 }); admin();
  await checkout("old", lines, false);
  store.payments[0].status = "successful";
  assert.equal((await cancel("old")).status, 200);
  assert.equal(store.database.get("tidb_a"), 10);
  assert.equal(store.remote.get("remote-b")!.stock, 8);
  assert.equal(store.movements.length, 0);
});

test("per-product sequence keeps a cancellation behind its take when distributed ids are out of order", async () => {
  const store = stockStore({ "remote-b": 8 }); admin();
  await checkout("one", [lines[1]]); store.failing = true;
  await settleCharge(charge("one"));
  assert.equal((await cancel("one")).status, 200);
  store.movements[0].id = BigInt(1000);
  store.movements[1].id = BigInt(1);
  store.failing = false;
  await retryStockMovements();
  assert.equal(store.remote.get("remote-b")!.stock, 8);
  assert.ok(store.movements.every((job) => job.state === "applied"));
});

test("a legacy payment is still recorded if remote stock cannot be checked until later", async () => {
  const store = stockStore({ "remote-b": 8 });
  await checkout("legacy", [lines[1]], false); store.failing = true;
  await settleCharge(charge("legacy"));
  assert.equal(store.payments[0].status, "successful");
  assert.ok(store.payments[0].order.stockIssue);
  store.failing = false;
  await settleCharge(charge("legacy"));
  assert.equal(store.payments[0].order.stockIssue, undefined);
  assert.equal(store.remote.get("remote-b")!.stock, 5);
});
