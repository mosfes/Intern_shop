import "dotenv/config";
import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";
import { SESSION_COOKIE, signAuthToken } from "../src/lib/google-auth";
import { applyOrderUpdate, customerOrder, validateOrderUpdate } from "../src/lib/admin-orders";
import { GET, PATCH } from "../src/app/api/admin/orders/route";
import type { Order } from "../src/lib/types";

Object.assign(process.env, { GOOGLE_CLIENT_ID: "test", GOOGLE_CLIENT_SECRET: "test", AUTH_SECRET: "test-session-secret-at-least-32-characters", AUTH_URL: "http://localhost:3000" });
function stub(target: object, method: string, implementation: unknown) {
  Object.defineProperty(target, method, { value: implementation, configurable: true });
}

const order: Order = { id: "CBABC12345", createdAt: "2026-11-16T10:00:00.000Z", status: "processing", lines: [{ productId: "1", name: "GPU", image: "", price: 1000, quantity: 1 }], subtotal: 1000, shipping: 60, total: 1060, shippingMethod: "จัดส่งมาตรฐาน", paymentMethod: "พร้อมเพย์ QR", address: "Bangkok" };
const users = [
  { googleId: "admin", email: "admin@example.com", name: "Admin", phone: "", disabled: false },
  { googleId: "customer", email: "customer@example.com", name: "Customer", phone: "0800000000", disabled: false },
];
const updatedAt = new Date("2026-11-17T03:00:00.000Z");
let row = { id: "pay-1", chargeId: "chrg_1", userId: "customer", amount: 106000, status: "successful", order: order as unknown, createdAt: updatedAt, updatedAt };
const writes: unknown[] = [];

stub(prisma.shopUser, "findUnique", async ({ where }: { where: { googleId?: string; email?: string } }) => users.find((user) => where.googleId ? user.googleId === where.googleId : user.email === where.email) ?? null);
stub(prisma.shopUser, "findMany", async () => [users[1]]);
stub(prisma.adminCredential, "findUnique", async ({ where }: { where: { email: string } }) => where.email === users[0].email ? { active: true, version: 1 } : null);
stub(prisma.adminActivityLog, "create", async () => ({ id: "log" }));
stub(prisma.adminActivityLog, "update", async () => ({}));
stub(prisma.checkoutPayment, "findMany", async ({ where }: { where: unknown }) => {
  // Only paid orders are ever listed.
  assert.match(JSON.stringify(where), /"status":"successful"/);
  return [row];
});
stub(prisma.checkoutPayment, "count", async () => 1);
stub(prisma.checkoutPayment, "findUnique", async ({ where }: { where: { id: string } }) => where.id === row.id ? row : null);
stub(prisma.checkoutPayment, "updateMany", async ({ where, data }: { where: { updatedAt: Date }; data: { order: unknown } }) => {
  if (where.updatedAt.getTime() !== row.updatedAt.getTime()) return { count: 0 };
  writes.push(data.order);
  row = { ...row, order: data.order, updatedAt: new Date(row.updatedAt.getTime() + 1000) };
  return { count: 1 };
});

async function cookie(id: string) {
  const user = users.find((account) => account.googleId === id)!;
  return `${SESSION_COOKIE}=${await signAuthToken({ sub: user.googleId, email: user.email, name: user.name }, "session", 60)}`;
}
const list = async (as?: string, search = "") => GET(new NextRequest(`http://localhost:3000/api/admin/orders${search}`, { headers: as ? { cookie: await cookie(as) } : {} }));
const patch = async (body: unknown, as = "admin") => PATCH(new NextRequest("http://localhost:3000/api/admin/orders", { method: "PATCH", headers: { cookie: await cookie(as), origin: "http://localhost:3000", "Content-Type": "application/json" }, body: JSON.stringify(body) }));

test("status transitions follow the fulfilment flow and cancelled is final", () => {
  const update = (status: string, extra = {}) => validateOrderUpdate({ id: "pay-1", status, ...extra });
  const shipped = applyOrderUpdate(order, update("shipped", { trackingNumber: " TH123 " }), new Date("2026-11-17T00:00:00Z"));
  assert.equal(shipped.status, "shipped");
  assert.equal(shipped.trackingNumber, "TH123");
  assert.equal(shipped.statusUpdatedAt, "2026-11-17T00:00:00.000Z");
  assert.throws(() => applyOrderUpdate(order, update("delivered")), /เปลี่ยนจาก/);
  const cancelled = applyOrderUpdate(order, update("cancelled"));
  assert.throws(() => applyOrderUpdate(cancelled, update("processing")), /ยกเลิกแล้ว/);
  assert.equal(applyOrderUpdate(cancelled, update("cancelled", { adminNote: "refunded" })).adminNote, "refunded");
  assert.throws(() => update("lost"), /สถานะ/);
  assert.throws(() => update("shipped", { trackingNumber: "<script>" }), /เลขพัสดุ/);
  assert.equal(customerOrder({ ...order, adminNote: "secret" }).adminNote, undefined);
});

test("only admins can list orders, with customer details and status counts", async () => {
  assert.equal((await list()).status, 401);
  assert.equal((await list("customer")).status, 403);
  assert.equal((await list("admin", "?status=lost")).status, 400);
  const response = await list("admin", "?status=processing&q=customer");
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.orders[0].order.id, "CBABC12345");
  assert.equal(data.orders[0].amount, 1060);
  assert.equal(data.orders[0].customer.email, "customer@example.com");
  assert.deepEqual(Object.keys(data.counts), ["all", "processing", "shipped", "delivered", "cancelled"]);
});

test("admin updates status, rejects stale edits and keeps customers out", async () => {
  assert.equal((await patch({ id: "pay-1", status: "shipped" }, "customer")).status, 403);
  const response = await patch({ id: "pay-1", status: "shipped", trackingNumber: "TH999", updatedAt: updatedAt.toISOString() });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).order.trackingNumber, "TH999");
  assert.equal((writes.at(-1) as Order).status, "shipped");
  // The same form submitted again carries the old timestamp.
  assert.equal((await patch({ id: "pay-1", status: "delivered", updatedAt: updatedAt.toISOString() })).status, 409);
  assert.equal((await patch({ id: "pay-1", status: "processing", updatedAt: row.updatedAt.toISOString() })).status, 200);
  assert.equal((await patch({ id: "missing", status: "shipped" })).status, 404);
  row = { ...row, status: "pending" };
  assert.equal((await patch({ id: "pay-1", status: "shipped" })).status, 404);
});
