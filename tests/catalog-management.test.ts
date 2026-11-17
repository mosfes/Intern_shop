import "dotenv/config";
import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";

// Isolate audit persistence in route tests.
Object.defineProperty(prisma.adminActivityLog, "create", { configurable: true, value: async () => ({ id: "test-log" }) });
Object.defineProperty(prisma.adminActivityLog, "update", { configurable: true, value: async () => ({}) });
import { GET, POST, PUT, DELETE } from "../src/app/api/admin/catalog/route";
import { SESSION_COOKIE, signAuthToken } from "../src/lib/google-auth";
import { buildCatalog, type CatalogData } from "../src/lib/catalog";
import { DEFAULT_CATEGORY_IMAGE, validateCatalogMetadata } from "../src/lib/catalog-metadata";

Object.assign(process.env, { AUTH_URL: "http://localhost:3000", AUTH_SECRET: "test-session-secret-at-least-32-characters", MOCKAPI_BASE_URL: "https://catalog.example.test", NEXT_PUBLIC_IMAGE_BASE_URL: "https://images.example.test" });
const require = createRequire(import.meta.url);
require("next/server").after = () => {};
require("next/cache").revalidateTag = () => {};
const stub = (target: object, method: string, value: unknown) => Object.defineProperty(target, method, { value, configurable: true, writable: true });
type Brand = { id: string; name: string; logoUrl: string | null; _count: { products: number } };
type Category = { id: string; slug: string; name: string; nameTh: string; description: string; image: string; _count: { products: number } };
const brands: Brand[] = [{ id: "amd", name: "AMD", logoUrl: null, _count: { products: 2 } }];
const categories: Category[] = [{ id: "cpu", slug: "cpu", name: "CPU", nameTh: "ซีพียู", description: "", image: "/images/cpu.webp", _count: { products: 1 } }];
let writeCount = 0, unavailable = false, foreignKeyRace = false;
stub(prisma.shopUser, "findUnique", async ({ where }: { where: { googleId: string } }) => ({ googleId: where.googleId, email: `${where.googleId}@example.com`, name: "Test", disabled: false, phone: "", picture: null }));
stub(prisma.adminCredential, "findUnique", async ({ where }: { where: { email: string } }) => where.email === "admin@example.com" ? { active: true } : null);
stub(prisma.brand, "findMany", async () => brands);
stub(prisma.category, "findMany", async () => categories);
stub(prisma.brand, "create", async ({ data }: { data: { name: string; logoUrl: string | null } }) => {
  if (brands.some((row) => row.name.toLocaleLowerCase() === data.name.toLocaleLowerCase())) throw { code: "P2002" };
  const row = { id: `brand-${brands.length}`, ...data, _count: { products: 0 } }; brands.push(row); writeCount++; return row;
});
stub(prisma.brand, "update", async ({ where, data }: { where: { id: string }; data: Partial<Brand> }) => {
  const row = brands.find((row) => row.id === where.id)!; Object.assign(row, data); writeCount++; return row;
});
stub(prisma.brand, "delete", async ({ where }: { where: { id: string } }) => {
  if (foreignKeyRace) throw { code: "P2003" };
  const [row] = brands.splice(brands.findIndex((row) => row.id === where.id), 1); writeCount++; return row;
});
stub(prisma.category, "create", async ({ data }: { data: Omit<Category, "id" | "_count"> }) => {
  if (categories.some((row) => row.slug === data.slug)) throw { code: "P2002" };
  const row = { id: `category-${categories.length}`, ...data, _count: { products: 0 } }; categories.push(row); writeCount++; return row;
});
stub(prisma.category, "update", async ({ where, data }: { where: { id: string }; data: Partial<Category> }) => {
  const row = categories.find((row) => row.id === where.id)!; Object.assign(row, data); writeCount++; return row;
});
stub(prisma.category, "delete", async ({ where }: { where: { id: string } }) => { const [row] = categories.splice(categories.findIndex((row) => row.id === where.id), 1); writeCount++; return row; });
// Category writes run in prisma.$transaction(write) — hand the stubbed client to the callback so nothing reaches the real database.
stub(prisma, "$transaction", async (write: (tx: typeof prisma) => Promise<unknown>) => write(prisma));
stub(prisma.categorySpecField, "deleteMany", async () => { writeCount++; return { count: 0 }; });
stub(prisma.categorySpecField, "createMany", async ({ data }: { data: unknown[] }) => { writeCount++; return { count: data.length }; });
stub(prisma.categorySpecField, "findMany", async () => []);
const remoteReads: string[] = [];
globalThis.fetch = async (url, init) => {
  assert.ok(!init?.method || init.method === "GET", "catalog management must not write to MockAPI");
  if (unavailable) throw new Error("private connection details");
  remoteReads.push(String(url));
  return Response.json([{ brand: "AMD", category: "cpu" }, { brand: "amd", category: "cpu" }, { brand: "Not imported", category: "not-imported" }]);
};
async function request(method = "GET", body?: object, identity?: string, origin = "http://localhost:3000") {
  const headers: Record<string, string> = { origin, "Content-Type": "application/json" };
  if (identity) headers.cookie = `${SESSION_COOKIE}=${await signAuthToken({ sub: identity, email: `${identity}@example.com`, name: "Test" }, "session", 60)}`;
  return new NextRequest("http://localhost:3000/api/admin/catalog", { method, headers, body: body ? JSON.stringify(body) : undefined });
}

test("catalog management verifies admin access and rejects cross-origin writes", async () => {
  assert.equal((await GET(await request())).status, 401);
  assert.equal((await GET(await request("GET", undefined, "customer"))).status, 403);
  for (const [method, handler] of [["POST", POST], ["PUT", PUT], ["DELETE", DELETE]] as const) {
    assert.equal((await handler(await request(method, { kind: "brand", name: "New" }, "customer"))).status, 403);
    assert.equal((await handler(await request(method, { kind: "brand", name: "New" }, "admin", "https://evil.test"))).status, 403);
  }
  assert.equal(writeCount, 0);
});

test("TiDB is authoritative for brand/category definitions; usage counts include both product stores", async () => {
  const response = await GET(await request("GET", undefined, "admin"));
  assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store");
  const data = await response.json();
  assert.equal(data.brands.length, 1); assert.equal(data.categories.length, 1);
  assert.equal(data.brands[0].source, "tidb"); assert.equal(data.categories[0].source, "tidb");
  assert.equal(data.brands[0].productCount, 4); assert.equal(data.brands[0].mockapiProductCount, 2);
  assert.equal(data.categories[0].productCount, 3);
  assert.ok(remoteReads.every((url) => url.endsWith("/products")));
});

test("brand CRUD writes only to TiDB and protects referenced names", async () => {
  const response = await POST(await request("POST", { kind: "brand", name: "New Brand", logoUrl: "" }, "admin"));
  assert.equal(response.status, 201); const { record } = await response.json();
  assert.equal(record.source, "tidb"); assert.equal(record.productCount, 0);
  assert.equal((await POST(await request("POST", { kind: "brand", name: "New Brand" }, "admin"))).status, 409);
  assert.equal((await PUT(await request("PUT", { kind: "brand", id: record.id, name: "Renamed Brand", logoUrl: "/brands/amd.svg" }, "admin"))).status, 200);
  assert.equal((await PUT(await request("PUT", { kind: "brand", id: "amd", name: "Unsafe Rename" }, "admin"))).status, 409);
  assert.equal((await PUT(await request("PUT", { kind: "brand", id: "amd", name: "AMD", logoUrl: "/brands/amd.svg" }, "admin"))).status, 200);
  assert.equal((await DELETE(await request("DELETE", { kind: "brand", id: "amd" }, "admin"))).status, 409);
  foreignKeyRace = true;
  assert.equal((await DELETE(await request("DELETE", { kind: "brand", id: record.id }, "admin"))).status, 409);
  foreignKeyRace = false;
  assert.equal((await DELETE(await request("DELETE", { kind: "brand", id: record.id }, "admin"))).status, 200);
});

test("category CRUD preserves stable slugs and blocks deletion while referenced", async () => {
  const input = { kind: "category", nameTh: "ทดสอบ", name: "Test", slug: "test-category", description: "Description", image: "" };
  const response = await POST(await request("POST", input, "admin")); assert.equal(response.status, 201);
  const { record } = await response.json(); assert.equal(record.image, DEFAULT_CATEGORY_IMAGE);
  assert.equal((await PUT(await request("PUT", { ...input, id: record.id, slug: "changed" }, "admin"))).status, 400);
  assert.equal((await PUT(await request("PUT", { ...input, id: record.id, nameTh: "ชื่อใหม่" }, "admin"))).status, 200);
  assert.equal((await POST(await request("POST", input, "admin"))).status, 409);
  assert.equal((await DELETE(await request("DELETE", { kind: "category", id: "cpu" }, "admin"))).status, 409);
  assert.equal((await DELETE(await request("DELETE", { kind: "category", id: record.id }, "admin"))).status, 200);
});

test("invalid metadata, Base64 images and failed reference checks never produce writes", async () => {
  for (const input of [{ kind: "unknown" }, { kind: "brand", name: " " }, { kind: "brand", name: "Test", logoUrl: "data:image/png;base64,AAAA" }, { kind: "category", nameTh: "ทดสอบ", slug: "BAD SLUG" }]) {
    assert.equal((await POST(await request("POST", input, "admin"))).status, 400);
  }
  const before = writeCount; unavailable = true;
  const response = await DELETE(await request("DELETE", { kind: "brand", id: "amd" }, "admin"));
  assert.equal(response.status, 503); assert.equal(writeCount, before);
  assert.ok(!JSON.stringify(await response.json()).includes("private")); unavailable = false;
});

test("custom TiDB brand logos override bundled/legacy logos in the storefront catalogue", () => {
  const data: CatalogData = { products: [], categories: [], logoSlugs: ["amd"], brandAssets: [{ name: "AMD", logoUrl: "https://images.example.test/custom.webp" }] };
  assert.equal(buildCatalog(data).uploadedLogoUrl("AMD"), "https://images.example.test/custom.webp");
  assert.equal(buildCatalog(data).uploadedLogoUrl("amd"), "https://images.example.test/custom.webp");
  assert.deepEqual(buildCatalog(data).managedBrands, ["AMD"]);
  // Homepage membership follows managed rows even without products or a logo.
  assert.deepEqual(buildCatalog({ ...data, brandAssets: [{ name: "New Brand", logoUrl: null }] }).managedBrands, ["New Brand"]);
  assert.deepEqual(buildCatalog({ ...data, brandAssets: [] }).managedBrands, []);
  assert.throws(() => validateCatalogMetadata("category", { nameTh: "Test", slug: "../bad" }));
});
