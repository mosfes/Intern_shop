import "dotenv/config";
import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";
import { SESSION_COOKIE, signAuthToken } from "../src/lib/google-auth";
import { PATCH } from "../src/app/api/admin/flash-sale/route";

Object.assign(process.env, { GOOGLE_CLIENT_ID: "test", GOOGLE_CLIENT_SECRET: "test", AUTH_SECRET: "test-session-secret-at-least-32-characters", AUTH_URL: "http://localhost:3000", MOCKAPI_BASE_URL: "https://catalog.example.test" });
const stub = (target: object, key: string, value: unknown) => Object.defineProperty(target, key, { configurable: true, value });
const invalidations: unknown[][] = [];
createRequire(import.meta.url)("next/cache").revalidateTag = (...args: unknown[]) => invalidations.push(args);
stub(prisma.shopUser, "findUnique", async ({ where }: { where: { googleId: string } }) => ({ googleId: where.googleId, email: `${where.googleId}@example.com`, name: "Test", disabled: false }));
stub(prisma.adminCredential, "findUnique", async ({ where }: { where: { email: string } }) => where.email === "admin@example.com" ? { active: true } : null);
stub(prisma.adminActivityLog, "create", async () => ({ id: "log" }));
stub(prisma.adminActivityLog, "update", async () => ({}));
let mockProduct = { id: "1", price: 899, stock: 4, tags: ["new"], images: ["/cpu.png"], reviews: [{ id: "review" }] };
const writes: Record<string, unknown>[] = [];
globalThis.fetch = async (_url, init) => {
  if (String(_url).endsWith("/missing")) return Response.json({}, { status: 404 });
  if (init?.method === "PUT") { const body = JSON.parse(String(init.body)); writes.push(body); mockProduct = { ...mockProduct, ...body }; }
  return Response.json(mockProduct);
};
let offers: { productId: string; price: number }[] = [];
stub(prisma.flashSaleItem, "findMany", async () => offers);
stub(prisma.flashSaleItem, "upsert", async ({ create, update }: { create: { productId: string; price: number }; update: { price: number } }) => {
  const existing = offers.find((offer) => offer.productId === create.productId);
  if (existing) existing.price = update.price; else offers.push({ ...create });
});
stub(prisma.flashSaleItem, "deleteMany", async ({ where }: { where: { productId: string } }) => { offers = offers.filter((offer) => offer.productId !== where.productId); });
stub(prisma.product, "findUnique", async () => ({ id: "tidb_1", price: 100, originalPrice: 200, brand: { name: "Test" }, category: { slug: "cpu" }, images: [], specifications: [], highlights: [], shortSpecs: [], reviews: [], tags: [{ tag: "new" }] }));
async function request(body: unknown, identity = "admin", origin = "http://localhost:3000") {
  const token = identity ? await signAuthToken({ sub: identity, email: `${identity}@example.com`, name: "Test" }, "session", 60) : "";
  return new NextRequest("http://localhost:3000/api/admin/flash-sale", { method: "PATCH", headers: { origin, "Content-Type": "application/json", cookie: `${SESSION_COOKIE}=${token}` }, body: JSON.stringify(body) });
}

test("flash sale requires an admin and same-origin mutations", async () => {
  assert.equal((await PATCH(await request({ id: "1", active: true }, ""))).status, 401);
  assert.equal((await PATCH(await request({ id: "1", active: true }, "customer"))).status, 403);
  assert.equal((await PATCH(await request({ id: "1", active: true }, "admin", "https://other.test"))).status, 403);
  assert.equal(writes.length, 0);
});
test("rejects malformed requests and missing products without mutations", async () => {
  for (const body of [null, [], {}, { id: "../1", active: true }, { id: "1", active: "false" }]) assert.equal((await PATCH(await request(body))).status, 400);
  assert.equal((await PATCH(await request({ id: "missing", active: true }))).status, 404);
  assert.equal(writes.length, 0);
});
test("separate prices preserve MockAPI regular prices, stock, images and tags", async () => {
  const before = structuredClone(mockProduct);
  for (let i = 0; i < 2; i++) assert.equal((await PATCH(await request({ id: "1", active: true, price: 599.50 }))).status, 200);
  assert.deepEqual(offers, [{ productId: "1", price: 599.50 }]);
  assert.deepEqual(mockProduct, before);
  assert.equal(writes.length, 0);
  for (const price of [undefined, 0, -1, 899, 900, "100", 0.001]) assert.equal((await PATCH(await request({ id: "1", active: true, price }))).status, 400);
  assert.deepEqual(offers, [{ productId: "1", price: 599.50 }]);
  assert.equal((await PATCH(await request({ id: "1", active: false }))).status, 200);
  assert.deepEqual(offers, []);
  assert.deepEqual(mockProduct, before);
  assert.deepEqual(invalidations.at(-1), ["catalog", { expire: 0 }]);
});
test("TiDB flash prices are stored separately and missing/deleted products can be removed", async () => {
  assert.equal((await PATCH(await request({ id: "tidb_1", active: true, price: 50 }))).status, 200);
  assert.deepEqual(offers, [{ productId: "tidb_1", price: 50 }]);
  assert.equal((await PATCH(await request({ id: "tidb_1", active: false }))).status, 200);
  assert.equal((await PATCH(await request({ id: "missing", active: false }))).status, 200);
  assert.deepEqual(offers, []);
});

test("schedule validation, Thai timezone conversion, and precise opening/expiry boundaries", async () => {
  const { validateFlashSaleSettings, bangkokDateInput, bangkokInputToISO, flashSaleWindow } = await import("../src/lib/flash-sale");
  const startsAt = bangkokInputToISO("2026-11-18T10:00");
  const endsAt = bangkokInputToISO("2026-11-18T12:00");
  assert.equal(startsAt, "2026-11-18T03:00:00.000Z");
  assert.equal(bangkokDateInput(startsAt), "2026-11-18T10:00");
  const settings = validateFlashSaleSettings({ enabled: true, startsAt, endsAt });
  const start = Date.parse(startsAt!); const end = Date.parse(endsAt!);
  assert.equal(flashSaleWindow(settings, start - 1).active, false);
  assert.equal(flashSaleWindow(settings, start).active, true);
  assert.equal(flashSaleWindow(settings, end - 1).active, true);
  assert.equal(flashSaleWindow(settings, end).active, false);
  assert.equal(flashSaleWindow(settings, end + 1000).secondsLeft, 0);
  assert.equal(flashSaleWindow({ ...settings, enabled: false }, start).active, false);
  assert.equal(flashSaleWindow({ enabled: true, startsAt: null, endsAt: null }, Date.parse("2026-11-18T16:59:00Z")).secondsLeft, 60);
  assert.equal(flashSaleWindow({ enabled: true, startsAt: null, endsAt: null }, Date.parse("2026-11-18T17:00:00Z")).secondsLeft, 86400);
  for (const value of [null, {}, { enabled: true, startsAt, endsAt: null }, { enabled: true, startsAt, endsAt: startsAt }, { enabled: true, startsAt: endsAt, endsAt: startsAt }, { enabled: true, startsAt: "2026-11-18T10:00", endsAt }, { enabled: true, startsAt: "invalid", endsAt }]) assert.throws(() => validateFlashSaleSettings(value));
});

test("schedule API persists settings and protects reads and writes", async () => {
  const { GET, PUT } = await import("../src/app/api/admin/flash-sale/route");
  let stored: { enabled: boolean; startsAt: Date | null; endsAt: Date | null } | null = null;
  stub(prisma.flashSaleSetting, "findUnique", async () => stored);
  stub(prisma.flashSaleSetting, "upsert", async ({ update }: { update: NonNullable<typeof stored> }) => { stored = update; return stored; });
  assert.equal((await GET(await request(null, ""))).status, 401);
  assert.equal((await GET(await request(null, "customer"))).status, 403);
  const initial = await GET(await request(null));
  assert.deepEqual((await initial.json()).settings, { enabled: true, startsAt: null, endsAt: null });
  const settings = { enabled: true, startsAt: "2026-11-18T03:00:00.000Z", endsAt: "2026-11-18T05:00:00.000Z" };
  assert.equal((await PUT(await request(settings, "customer"))).status, 403);
  assert.equal((await PUT(await request(settings, "admin", "https://other.test"))).status, 403);
  assert.equal((await PUT(await request({ ...settings, endsAt: settings.startsAt }))).status, 400);
  assert.equal(stored, null);
  assert.equal((await PUT(await request(settings))).status, 200);
  assert.deepEqual((await (await GET(await request(null))).json()).settings, settings);
  assert.deepEqual(invalidations.at(-1), ["flash-sale-settings", { expire: 0 }]);
  const daily = { enabled: false, startsAt: null, endsAt: null };
  assert.equal((await PUT(await request(daily))).status, 200);
  assert.deepEqual((await (await GET(await request(null))).json()).settings, daily);
});

test("sale prices apply only inside their window and checkout uses the same price", async () => {
  const { withFlashSalePrice } = await import("../src/lib/flash-sale");
  const { priceOrder } = await import("../src/lib/payments");
  const product = { id: "test", price: 1000, originalPrice: 1200, discount: 17, stock: 10, name: "CPU", flashSale: { enabled: true, startsAt: "2026-11-18T03:00:00Z", endsAt: "2026-11-18T05:00:00Z", price: 750.25, regularPrice: 1000, regularOriginalPrice: 1200 } };
  const start = Date.parse(product.flashSale.startsAt); const end = Date.parse(product.flashSale.endsAt);
  assert.equal(withFlashSalePrice(product, start - 1).price, 1000);
  const active = withFlashSalePrice(product, start);
  assert.equal(active.price, 750.25); assert.equal(active.originalPrice, 1000);
  assert.equal(withFlashSalePrice(active, end).price, 1000);
  assert.equal(withFlashSalePrice(active, end).originalPrice, 1200);
  assert.equal(withFlashSalePrice({ ...product, flashSale: { ...product.flashSale, enabled: false } }, start).price, 1000);
  assert.equal(withFlashSalePrice({ ...product, flashSale: { ...product.flashSale, price: 1100 } }, start).price, 1000);
  const map = new Map([[product.id, product as unknown as import("../src/lib/types").Product]]);
  const lines = [{ productId: "test", quantity: 2, price: 1 }];
  assert.equal(priceOrder(lines, map, "standard", null, new Date(start)).subtotal, 1500.50);
  assert.equal(priceOrder(lines, map, "standard", null, new Date(end)).subtotal, 2000);
  assert.equal(product.price, 1000);
});
