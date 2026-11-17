import "dotenv/config";
import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";
import { SESSION_COOKIE, signAuthToken } from "../src/lib/google-auth";
import { GET } from "../src/app/api/admin/users/[id]/shopping/route";

Object.assign(process.env, { GOOGLE_CLIENT_ID: "test", GOOGLE_CLIENT_SECRET: "test", AUTH_SECRET: "test-session-secret-at-least-32-characters", AUTH_URL: "http://localhost:3000", MOCKAPI_BASE_URL: "https://catalog.example.test" });
function stub(target: object, method: string, implementation: unknown) {
  Object.defineProperty(target, method, { value: implementation, configurable: true });
}
const now = new Date("2026-11-17T03:00:00Z");
const users = [
  { googleId: "admin", email: "admin@example.com", name: "Admin", disabled: false },
  { googleId: "customer", email: "customer@example.com", name: "Customer", disabled: false },
  { googleId: "other", email: "other@example.com", name: "Other", disabled: true },
];
stub(prisma.shopUser, "findUnique", async ({ where }: { where: { googleId?: string; email?: string } }) => users.find((user) => where.googleId ? user.googleId === where.googleId : user.email === where.email) ?? null);
stub(prisma.adminCredential, "findUnique", async ({ where }: { where: { email: string } }) => where.email === users[0].email ? { active: true, version: 1 } : null);
let reads = 0;
stub(prisma.cartItem, "findMany", async ({ where }: { where: { userId: string } }) => {
  reads++;
  return where.userId === "customer" ? ["1", "deleted", "offline"].map((productId) => ({ productId, quantity: 2, selected: productId === "1", updatedAt: now })) : [];
});
const snapshot = { id: "CB123", lines: [{ productId: "1", name: "Original product name", price: 99, quantity: 2 }], total: 198, address: "Saved address" };
stub(prisma.checkoutPayment, "findMany", async ({ where, skip, take, orderBy }: { where: { userId: string }; skip: number; take: number; orderBy: unknown }) => {
  reads++;
  assert.equal(take, 20);
  assert.deepEqual(orderBy, [{ createdAt: "desc" }, { id: "desc" }]);
  return where.userId === "customer" && skip === 0 ? ["successful", "pending", "failed"].map((status) => ({ id: status, chargeId: "charge-1", status, amount: 19800, createdAt: now, order: snapshot })) : [];
});
stub(prisma.checkoutPayment, "count", async ({ where }: { where: { userId: string } }) => where.userId === "customer" ? 21 : 0);
globalThis.fetch = async (input) => {
  const url = String(input);
  if (url.endsWith("/deleted")) return new Response("{}", { status: 404 });
  if (url.endsWith("/offline")) throw new Error("Unavailable");
  assert.ok(url.endsWith("/products/1"));
  return Response.json({ id: "1", name: "Current product name", slug: "current-product", images: ["https://images.example.test/product.jpg"], price: 125 });
};

async function request(identity?: string, id = "customer", page = "1") {
  const user = users.find((user) => user.googleId === identity);
  const token = user ? await signAuthToken({ sub: user.googleId, email: user.email, name: user.name }, "session", 60) : null;
  return GET(new NextRequest(`http://localhost:3000/api/admin/users/${id}/shopping?page=${page}`, { headers: token ? { cookie: `${SESSION_COOKIE}=${token}` } : {} }), { params: Promise.resolve({ id }) });
}

test("shopping details reject guests and customers before reading shopping data", async () => {
  assert.equal((await request()).status, 401);
  assert.equal((await request("customer", "other")).status, 403);
  assert.equal(reads, 0);
});

test("admin sees only the selected customer's cart and payment snapshots", async () => {
  const response = await request("admin");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const data = await response.json();
  assert.equal(data.cart[0].name, "Current product name");
  assert.equal(data.cart[0].price, 125);
  assert.equal(data.cart[0].image, "https://images.example.test/product.jpg");
  assert.equal(data.cart[1].image, null);
  assert.equal(data.cart[2].image, null);
  assert.equal(data.cart[1].availability, "removed");
  assert.equal(data.cart[2].availability, "unavailable");
  assert.equal(data.cart[1].price, null);
  assert.deepEqual(data.orders.map((order: { status: string }) => order.status), ["successful", "pending", "failed"]);
  assert.deepEqual(data.orders[0].order, snapshot);
  assert.equal(data.orders[0].amount, 198);
  assert.equal(data.totalOrders, 21);
  assert.deepEqual((await (await request("admin", "other")).json()).cart, []);
  assert.deepEqual((await (await request("admin", "other")).json()).orders, []);
});

test("pagination, missing accounts and admin accounts are handled", async () => {
  const data = await (await request("admin", "customer", "2")).json();
  assert.equal(data.page, 2);
  assert.deepEqual(data.orders, []);
  assert.equal((await request("admin", "missing")).status, 404);
  assert.equal((await request("admin", "admin")).status, 400);
  for (const page of ["0", "-1", "1.5", "abc", "1000001"]) assert.equal((await request("admin", "customer", page)).status, 400);
});
