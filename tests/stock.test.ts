import "dotenv/config";
import assert from "node:assert/strict";
import { after, mock, test } from "node:test";
import { NextRequest } from "next/server";
import { PATCH } from "../src/app/api/admin/orders/route";
import { customerOrder } from "../src/lib/admin-orders";
import { SESSION_COOKIE, signAuthToken } from "../src/lib/google-auth";
import type { OmiseCharge } from "../src/lib/omise";
import { settleCharge } from "../src/lib/payment-settlement";
import { prisma } from "../src/lib/prisma";
import { adjustDatabaseStock } from "../src/lib/stock";
import type { Order } from "../src/lib/types";

Object.assign(process.env, { GOOGLE_CLIENT_ID: "test", GOOGLE_CLIENT_SECRET: "test", AUTH_SECRET: "test-session-secret-at-least-32-characters", AUTH_URL: "http://localhost:3000", MOCKAPI_BASE_URL: "https://mock.test" });
delete process.env.RESEND_API_KEY;
function stub(target: object, method: string, implementation: unknown) {
  Object.defineProperty(target, method, { value: implementation, configurable: true, writable: true });
}
const originalTransaction = prisma.$transaction;
const restore = () => { prisma.$transaction = originalTransaction; mock.restoreAll(); };
after(() => prisma.$disconnect());

/** An in-memory stock table plus a fake MockAPI, standing in for the two places stock lives. */
function shelves(initial: Record<string, number>) {
  const db = new Map(Object.entries(initial).filter(([id]) => id.startsWith("tidb_")));
  const remote = new Map(Object.entries(initial).filter(([id]) => !id.startsWith("tidb_")));
  const calls: string[] = [];
  mock.method(globalThis, "fetch", async (url: string, init?: RequestInit) => {
    const id = decodeURIComponent(url.split("/products/")[1]);
    calls.push(`${init?.method ?? "GET"} ${id}`);
    if (!remote.has(id)) return new Response("{}", { status: 404 });
    if (init?.method === "PUT") { remote.set(id, JSON.parse(String(init.body)).stock); return Response.json({ id }); }
    return Response.json({ id, name: id, stock: remote.get(id) });
  });
  const product = {
    updateMany: async ({ where, data }: { where: { id: string }; data: { stock: { decrement?: number; increment?: number } } }) => {
      if (!db.has(where.id)) return { count: 0 };
      db.set(where.id, db.get(where.id)! - (data.stock.decrement ?? 0) + (data.stock.increment ?? 0));
      return { count: 1 };
    },
  };
  return { db, remote, calls, product };
}

const charge: OmiseCharge = {
  id: "chrg_stock_1", status: "successful", paid: true, amount: 20000, currency: "thb",
  authorize_uri: null, failure_code: null, failure_message: null, expires_at: null,
  metadata: { userId: "customer-1", checkoutId: "checkout-stock" },
};
const lines = [
  { productId: "tidb_a", name: "A", image: "", price: 50, quantity: 2 },
  { productId: "remote-b", name: "B", image: "", price: 100, quantity: 3 },
];

function fakePayment(stock: ReturnType<typeof shelves>) {
  const row = { id: "checkout-stock", chargeId: null as string | null, userId: "customer-1", amount: 20000, status: "pending", order: { id: "checkout-stock", status: "processing", lines, total: 200 } as Record<string, unknown> };
  const tx = {
    checkoutPayment: {
      findFirst: async () => row,
      updateMany: async ({ where, data }: { where: { status: string | { not: string } }; data: { status: string; chargeId: string; order: Record<string, unknown> } }) => {
        const matches = typeof where.status === "string" ? row.status === where.status : row.status !== where.status.not;
        if (!matches) return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      },
    },
    paymentCharge: { createMany: async () => ({ count: 1 }) },
    discountCode: { updateMany: async () => ({}) },
    cartItem: { deleteMany: async () => ({}) },
    product: stock.product,
  };
  prisma.$transaction = (async (callback: unknown) => (callback as (client: unknown) => unknown)(tx)) as typeof prisma.$transaction;
  return row;
}

test("a successful payment takes stock once, for TiDB and MockAPI products, even when events repeat", async () => {
  const stock = shelves({ tidb_a: 10, "remote-b": 8 });
  const row = fakePayment(stock);
  try {
    await settleCharge(charge);
    assert.equal(stock.db.get("tidb_a"), 8);
    assert.equal(stock.remote.get("remote-b"), 5);
    assert.equal(row.status, "successful");
    assert.equal((row.order as unknown as Order).stockTaken, true);
    // The webhook and the customer's return can both settle the same charge, and late events can follow.
    await settleCharge(charge);
    await settleCharge({ ...charge, status: "pending", paid: false });
    await settleCharge({ ...charge, status: "failed", paid: false });
    assert.equal(stock.db.get("tidb_a"), 8);
    assert.equal(stock.remote.get("remote-b"), 5);
    assert.deepEqual(stock.calls, ["GET remote-b", "PUT remote-b"]);
  } finally { restore(); }
});

test("pending, failed and expired payments leave stock alone", async () => {
  for (const status of ["pending", "failed", "expired"]) {
    const stock = shelves({ tidb_a: 10, "remote-b": 8 });
    fakePayment(stock);
    try {
      await settleCharge({ ...charge, status, paid: false });
      assert.equal(stock.db.get("tidb_a"), 10);
      assert.equal(stock.remote.get("remote-b"), 8);
      assert.deepEqual(stock.calls, []);
    } finally { restore(); }
  }
});

test("a paid order that outruns the shelf drives stock below zero instead of losing the sale", async () => {
  const stock = shelves({ tidb_a: 1 });
  try {
    await adjustDatabaseStock(stock as unknown as Parameters<typeof adjustDatabaseStock>[0], [{ productId: "tidb_a", quantity: 3 }], "take");
    assert.equal(stock.db.get("tidb_a"), -2);
  } finally { restore(); }
});

test("lines without a positive whole quantity are ignored", async () => {
  const stock = shelves({ tidb_a: 5 });
  try {
    const external = await adjustDatabaseStock({ product: stock.product } as never, [{ productId: "tidb_a" }, { productId: "tidb_a", quantity: 0 }, { productId: "tidb_a", quantity: 1.5 }, { productId: "remote-b", quantity: -1 }], "take");
    assert.equal(stock.db.get("tidb_a"), 5);
    assert.deepEqual(external, []);
  } finally { restore(); }
});

test("customers never see the internal stock flag", () => {
  const order = { id: "CB1", stockTaken: true, adminNote: "x" } as Order;
  assert.equal(customerOrder(order).stockTaken, undefined);
});

// ---- cancelling ----
const adminUser = { googleId: "admin", email: "admin@example.com", name: "Admin", phone: "", disabled: false };
stub(prisma.shopUser, "findUnique", async () => adminUser);
stub(prisma.adminCredential, "findUnique", async () => ({ active: true, version: 1 }));
stub(prisma.adminActivityLog, "create", async () => ({ id: "log" }));
stub(prisma.adminActivityLog, "update", async () => ({}));
const updatedAt = new Date("2026-11-17T03:00:00.000Z");
let saved: { order: Order; updatedAt: Date; status: string };
const cancel = async () => PATCH(new NextRequest("http://localhost:3000/api/admin/orders", {
  method: "PATCH",
  headers: { cookie: `${SESSION_COOKIE}=${await signAuthToken({ sub: adminUser.googleId, email: adminUser.email, name: adminUser.name }, "session", 60)}`, origin: "http://localhost:3000", "Content-Type": "application/json" },
  body: JSON.stringify({ id: "pay-1", status: "cancelled", updatedAt: saved.updatedAt.toISOString() }),
}));

function fakeStore(stock: ReturnType<typeof shelves>, order: Partial<Order>) {
  saved = { status: "successful", updatedAt, order: { id: "CB1", createdAt: "2026-11-16T10:00:00.000Z", status: "processing", lines, subtotal: 200, shipping: 0, total: 200, shippingMethod: "", paymentMethod: "", address: "", ...order } as Order };
  const checkoutPayment = {
    findUnique: async () => ({ id: "pay-1", userId: "customer-1", status: saved.status, updatedAt: saved.updatedAt, order: saved.order }),
    updateMany: async ({ where, data }: { where: { updatedAt: Date }; data: { order: Order } }) => {
      if (where.updatedAt.getTime() !== saved.updatedAt.getTime()) return { count: 0 };
      saved = { ...saved, order: data.order, updatedAt: new Date(saved.updatedAt.getTime() + 1000) };
      return { count: 1 };
    },
  };
  stub(prisma, "checkoutPayment", checkoutPayment);
  prisma.$transaction = (async (callback: unknown) => (callback as (client: unknown) => unknown)({ checkoutPayment, product: stock.product })) as typeof prisma.$transaction;
}

test("cancelling a paid order whose stock was taken puts it back once", async () => {
  const stock = shelves({ tidb_a: 8, "remote-b": 5 });
  fakeStore(stock, { stockTaken: true });
  try {
    assert.equal((await cancel()).status, 200);
    assert.equal(stock.db.get("tidb_a"), 10);
    assert.equal(stock.remote.get("remote-b"), 8);
    assert.equal(saved.order.status, "cancelled");
    assert.equal(saved.order.stockTaken, false);
    // Cancelled is final: saving it again changes nothing.
    assert.equal((await cancel()).status, 200);
    assert.equal(stock.db.get("tidb_a"), 10);
    assert.equal(stock.remote.get("remote-b"), 8);
  } finally { restore(); }
});

test("cancelling an order paid before stock was tracked does not invent stock", async () => {
  const stock = shelves({ tidb_a: 8, "remote-b": 5 });
  fakeStore(stock, {});
  try {
    assert.equal((await cancel()).status, 200);
    assert.equal(stock.db.get("tidb_a"), 8);
    assert.equal(stock.remote.get("remote-b"), 5);
    assert.deepEqual(stock.calls, []);
  } finally { restore(); }
});

test("a stale cancel does not put stock back", async () => {
  const stock = shelves({ tidb_a: 8 });
  fakeStore(stock, { stockTaken: true });
  try {
    const stale = saved.updatedAt;
    saved.updatedAt = new Date(stale.getTime() + 5000);
    const response = await PATCH(new NextRequest("http://localhost:3000/api/admin/orders", {
      method: "PATCH",
      headers: { cookie: `${SESSION_COOKIE}=${await signAuthToken({ sub: adminUser.googleId, email: adminUser.email, name: adminUser.name }, "session", 60)}`, origin: "http://localhost:3000", "Content-Type": "application/json" },
      body: JSON.stringify({ id: "pay-1", status: "cancelled", updatedAt: stale.toISOString() }),
    }));
    assert.equal(response.status, 409);
    assert.equal(stock.db.get("tidb_a"), 8);
  } finally { restore(); }
});
