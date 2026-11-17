import "dotenv/config";
import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";
import { SESSION_COOKIE, signAuthToken } from "../src/lib/google-auth";
import { GET, POST, PUT, DELETE } from "../src/app/api/admin/products/route";
import { validateProductInput } from "../src/lib/product-management";
import type { StoredProduct } from "../src/lib/product-storage";

Object.assign(process.env, { GOOGLE_CLIENT_ID: "test", GOOGLE_CLIENT_SECRET: "test", AUTH_SECRET: "test-session-secret-at-least-32-characters", AUTH_URL: "http://localhost:3000", MOCKAPI_BASE_URL: "https://catalog.example.test", NEXT_PUBLIC_IMAGE_BASE_URL: "https://images.example.test" });
const categories = [{ slug: "cpu", name: "CPU", nameTh: "ซีพียู", description: "", image: "/cpu.webp" }];
const input = { name: "Test CPU", slug: "test-cpu", category: "cpu", brand: "Test", price: 800, originalPrice: 1000, stock: 5, images: ["https://images.example.test/cpu.webp"], description: "รายละเอียด", highlights: ["Fast"], shortSpecs: ["AM5"], specifications: [{ label: "Socket", value: "AM5" }], warranty: "3 ปี", tags: ["new"] };
const initial = { ...validateProductInput(input, categories), id: "1", rating: 4.5, reviewCount: 1, reviews: [{ id: "r1", author: "Customer", rating: 5, date: "2026-11-17", title: "Good", body: "Great", verified: true }], customField: "preserved" };
let rows = [structuredClone(initial)];
let databaseRows: StoredProduct[] = [];
let databaseBrands: { id: string; name: string; logoUrl: string | null }[] = [];
let databaseCategories: (typeof categories[number] & { id: string })[] = categories.map((row) => ({ ...row, id: "category-cpu" }));
let databaseCreateFailure = "";
let calls: { method: string; resource: string }[] = [];
const invalidations: unknown[][] = [];
const require = createRequire(import.meta.url);
require("next/server").after = () => {};
require("next/cache").revalidateTag = (...args: unknown[]) => invalidations.push(args);
const stub = (target: object, method: string, value: unknown) => Object.defineProperty(target, method, { value, configurable: true, writable: true });
stub(prisma.shopUser, "findUnique", async ({ where }: { where: { googleId: string } }) => ({ googleId: where.googleId, email: `${where.googleId}@example.com`, name: "Test", disabled: where.googleId === "disabled", phone: "", picture: null }));
stub(prisma.adminCredential, "findUnique", async ({ where }: { where: { email: string } }) => where.email === "customer@example.com" ? null : { active: true, passwordHash: "hash", mustChangePassword: where.email === "reset@example.com", version: 1 });
stub(prisma, "$transaction", async (run: (tx: typeof prisma) => Promise<unknown>) => run(prisma));
stub(prisma.brand, "upsert", async ({ where, create }: { where: { name: string }; create: { name: string } }) => {
  let row = databaseBrands.find((row) => row.name === where.name);
  if (!row) { row = { id: `brand-${databaseBrands.length + 1}`, ...create, logoUrl: null }; databaseBrands.push(row); }
  return row;
});
stub(prisma.category, "upsert", async ({ where, create }: { where: { slug: string }; create: typeof categories[number] }) => {
  let row = databaseCategories.find((row) => row.slug === where.slug);
  if (!row) { row = { id: `category-${databaseCategories.length + 1}`, ...create }; databaseCategories.push(row); }
  return row;
});
stub(prisma.category, "findMany", async () => databaseCategories);
stub(prisma.brand, "findMany", async () => databaseBrands);
function materialize(data: Record<string, unknown>, existing?: StoredProduct): StoredProduct {
  const id = String(data.id ?? existing?.id);
  const nested = (key: string) => ((data[key] as { create: Record<string, unknown>[] } | undefined)?.create ?? []).map((row, index) => ({ id: `${key}-${index}`, productId: id, ...row }));
  return {
    ...existing, ...data, id, createdAt: existing?.createdAt ?? new Date(), updatedAt: new Date(),
    rating: data.rating ?? existing?.rating ?? 0, reviewCount: data.reviewCount ?? existing?.reviewCount ?? 0,
    brand: databaseBrands.find((row) => row.id === data.brandId), category: databaseCategories.find((row) => row.id === data.categoryId),
    images: nested("images"), specifications: nested("specifications"), highlights: nested("highlights"), shortSpecs: nested("shortSpecs"), tags: nested("tags"),
    reviews: data.reviews ? nested("reviews") : existing?.reviews ?? [],
  } as unknown as StoredProduct;
}
stub(prisma.product, "findMany", async () => databaseRows);
stub(prisma.product, "findUnique", async ({ where }: { where: { id: string } }) => databaseRows.find((row) => row.id === where.id) ?? null);
stub(prisma.product, "create", async ({ data }: { data: Record<string, unknown> }) => {
  if (databaseCreateFailure === "P2002" || databaseRows.some((row) => row.slug === data.slug)) throw { code: "P2002" };
  if (databaseCreateFailure) throw new Error("secret database connection details");
  const row = materialize(data); databaseRows.push(row); return row;
});
stub(prisma.product, "update", async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
  const index = databaseRows.findIndex((row) => row.id === where.id);
  if (index === -1) throw { code: "P2025" };
  databaseRows[index] = materialize(data, databaseRows[index]); return databaseRows[index];
});
stub(prisma.product, "deleteMany", async ({ where }: { where: { id: string } }) => {
  const before = databaseRows.length;
  databaseRows = databaseRows.filter((row) => row.id !== where.id);
  return { count: before - databaseRows.length };
});
globalThis.fetch = async (url, init) => {
  const resource = String(url).replace("https://catalog.example.test/", "");
  const method = init?.method ?? "GET";
  calls.push({ method, resource });
  if (resource === "categories") return Response.json(categories);
  if (resource === "products" && method === "GET") return Response.json(rows);
  if (method === "POST") throw new Error("New products must never be written to MockAPI");
  const index = rows.findIndex((row) => `products/${row.id}` === resource);
  if (index === -1) return Response.json({}, { status: 404 });
  if (method === "DELETE") return Response.json(rows.splice(index, 1)[0]);
  if (method === "PUT") rows[index] = { ...rows[index], ...JSON.parse(String(init?.body)) };
  return Response.json(rows[index]);
};

async function request(method = "GET", body?: unknown, identity?: string, origin = "http://localhost:3000") {
  const headers: Record<string, string> = { origin, "Content-Type": "application/json" };
  if (identity) headers.cookie = `${SESSION_COOKIE}=${await signAuthToken({ sub: identity, email: `${identity}@example.com`, name: "Test", ...(identity === "reset" ? { authMethod: "password", credentialVersion: 1 } : {}) }, "session", 60)}`;
  return new NextRequest("http://localhost:3000/api/admin/products", { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}

test("product validation rejects invalid pricing, stock, URLs, categories and specs", () => {
  assert.equal(validateProductInput(input, categories).discount, 20);
  for (const invalid of [
    { price: -1 }, { price: NaN }, { price: 1.001 }, { originalPrice: 500 }, { stock: -1 }, { stock: 0.5 },
    { slug: "Bad Slug" }, { name: " " }, { category: "missing" }, { images: [] },
    { images: ["https://other.test/image.jpg"] }, { images: ["//evil.test/a.jpg"] }, { images: ["/\\evil.test/a.jpg"] },
    { tags: ["invalid"] }, { tags: ["new", "new"] }, { specifications: [{ label: "Socket", value: "" }] },
  ]) assert.throws(() => validateProductInput({ ...input, ...invalid }, categories));
  assert.equal(validateProductInput({ ...input, images: ["/images/cpu.webp"], stock: 0 }, categories).stock, 0);
});

test("catalog access and all mutations enforce current admin membership and origin", async () => {
  calls = [];
  assert.equal((await GET(await request())).status, 401);
  assert.equal((await GET(await request("GET", undefined, "customer"))).status, 403);
  assert.equal((await GET(await request("GET", undefined, "disabled"))).status, 401);
  assert.equal((await GET(await request("GET", undefined, "reset"))).status, 403);
  for (const [method, handler] of [["POST", POST], ["PUT", PUT], ["DELETE", DELETE]] as const) {
    assert.equal((await handler(await request(method, input, "customer"))).status, 403);
    assert.equal((await handler(await request(method, input, "admin", "https://evil.test"))).status, 403);
  }
  assert.equal(calls.length, 0);
  const result = await GET(await request("GET", undefined, "admin"));
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("cache-control"), "no-store");
  const directory = await result.json();
  assert.equal(directory.products.length, 1);
  assert.equal(directory.products[0].source, "mockapi");
});

test("new products persist only in TiDB; mixed listings and mutations use the actual source", async () => {
  rows = [structuredClone(initial)]; databaseRows = []; calls = []; invalidations.length = 0;
  assert.equal((await POST(await request("POST", input, "admin"))).status, 409);
  assert.equal((await PUT(await request("PUT", { ...input, id: "../categories" }, "admin"))).status, 400);
  assert.equal((await PUT(await request("PUT", { ...input, id: "999" }, "admin"))).status, 404);
  const created = await POST(await request("POST", { ...input, slug: "second-cpu", source: "mockapi", rating: 5, reviews: ["fake"] }, "admin"));
  assert.equal(created.status, 201);
  const newProduct = (await created.json()).product;
  assert.equal(newProduct.source, "tidb"); assert.ok(newProduct.id.startsWith("tidb_"));
  assert.equal(newProduct.rating, 0); assert.deepEqual(newProduct.reviews, []);
  assert.equal(databaseRows.length, 1); assert.equal(rows.length, 1);
  assert.equal(calls.some((call) => call.method === "POST"), false);
  assert.equal((await POST(await request("POST", { ...input, slug: "second-cpu" }, "admin"))).status, 409);
  const directory = await (await GET(await request("GET", undefined, "admin"))).json();
  assert.deepEqual(directory.products.map((product: { source: string }) => product.source), ["tidb", "mockapi"]);
  // Clients cannot redirect writes by forging the source field.
  const updated = await PUT(await request("PUT", { ...input, id: "1", source: "tidb", name: "Updated", price: 700, stock: 0, rating: 0, reviews: [] }, "admin"));
  assert.equal(updated.status, 200);
  const { product } = await updated.json();
  assert.equal(product.source, "mockapi"); assert.equal(product.name, "Updated"); assert.equal(product.discount, 30);
  assert.equal(product.rating, 4.5); assert.deepEqual(product.reviews, initial.reviews); assert.equal(product.customField, "preserved");
  assert.equal((await PUT(await request("PUT", { ...input, id: newProduct.id }, "admin"))).status, 409);
  const dbUpdated = await PUT(await request("PUT", { ...input, id: newProduct.id, slug: "second-cpu", source: "mockapi", name: "TiDB Updated", stock: 0, rating: 5 }, "admin"));
  assert.equal(dbUpdated.status, 200);
  const dbProduct = (await dbUpdated.json()).product;
  assert.equal(dbProduct.source, "tidb"); assert.equal(dbProduct.name, "TiDB Updated"); assert.equal(dbProduct.stock, 0); assert.equal(dbProduct.rating, 0);
  assert.equal(databaseRows[0].name, "TiDB Updated");
  assert.equal((await DELETE(await request("DELETE", { id: newProduct.id, source: "mockapi" }, "admin"))).status, 200);
  assert.equal(databaseRows.length, 0); assert.equal(rows.length, 1);
  assert.equal((await DELETE(await request("DELETE", { id: "1", source: "tidb" }, "admin"))).status, 200);
  assert.equal(rows.length, 0);
  assert.deepEqual(invalidations, Array.from({ length: 5 }, () => ["catalog", { expire: 0 }]));
  assert.equal((await DELETE(await request("DELETE", { id: newProduct.id }, "admin"))).status, 404);
  assert.equal((await DELETE(await request("DELETE", { id: "999" }, "admin"))).status, 404);
});

test("TiDB conflicts return 409 and database failures never fall back to MockAPI writes", async () => {
  databaseCreateFailure = "P2002";
  assert.equal((await POST(await request("POST", input, "admin"))).status, 409);
  databaseCreateFailure = "unavailable";
  const response = await POST(await request("POST", input, "admin"));
  assert.equal(response.status, 503);
  assert.ok(!JSON.stringify(await response.json()).includes("secret"));
  assert.equal(calls.some((call) => call.method === "POST"), false);
  databaseCreateFailure = "";
});

test("TiDB separates and reuses brands and categories and stores selected specs as highlights", async () => {
  databaseRows = []; databaseBrands = []; databaseCategories = categories.map((row) => ({ ...row, id: "category-cpu" })); rows = [];
  const first = await POST(await request("POST", { ...input, highlights: ["Socket: AM5"] }, "admin"));
  assert.equal(first.status, 201);
  assert.deepEqual((await first.json()).product.highlights, ["Socket: AM5"]);
  const second = await POST(await request("POST", { ...input, slug: "another-cpu", images: ["/images/one.webp", "/images/two.webp"] }, "admin"));
  assert.equal(second.status, 201);
  assert.equal(databaseBrands.length, 1); assert.equal(databaseCategories.length, 1);
  assert.equal(databaseRows[0].brandId, databaseRows[1].brandId);
  assert.equal(databaseRows[0].categoryId, databaseRows[1].categoryId);
  assert.equal(databaseRows[0].specifications[0].isHighlighted, true);
  assert.equal(databaseRows[0].highlights.length, 0);
  assert.equal(databaseRows[1].highlights[0].text, "Fast");
  assert.deepEqual(databaseRows[1].images.map((row) => row.position), [0, 1]);
  assert.equal(calls.some((call) => call.method === "POST"), false);
});

test("upstream failures are reported without leaking internal details", async () => {
  globalThis.fetch = async () => { throw new Error("secret upstream config"); };
  const response = await GET(await request("GET", undefined, "admin"));
  assert.equal(response.status, 503);
  assert.ok(!JSON.stringify(await response.json()).includes("secret"));
});
