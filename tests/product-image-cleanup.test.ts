import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextRequest } from "next/server";
import type { ImageUpload } from "../src/generated/prisma/client";
import { prisma } from "../src/lib/prisma";
import { cleanupDraftImages, cleanupExpiredImageUploads, cleanupRemovedProductImages, withProductImageUploads } from "../src/lib/product-image-lifecycle";
import { managedImageKey } from "../src/lib/r2-storage";
import { POST } from "../src/app/api/admin/products/images/cleanup/route";
import { SESSION_COOKIE, signAuthToken } from "../src/lib/google-auth";

Object.assign(process.env, { AUTH_URL: "http://localhost:3000", AUTH_SECRET: "test-session-secret-at-least-32-characters", MOCKAPI_BASE_URL: "https://catalog.example.test", NEXT_PUBLIC_IMAGE_BASE_URL: "https://images.example.test", R2_ACCOUNT_ID: "test", R2_BUCKET: "test", R2_ACCESS_KEY_ID: "test", R2_SECRET_ACCESS_KEY: "test" });
const draftId = "11111111-1111-4111-8111-111111111111";
const rows = new Map<string, ImageUpload>();
const databaseReferences = new Set<string>(), remoteReferences = new Set<string>(), categoryReferences = new Set<string>(), brandReferences = new Set<string>();
const objects = new Set<string>(), deleted: string[] = [];
let failRemote = false, failStorage = false;
let deletionGate: (() => Promise<void>) | undefined;
let transactionTail = Promise.resolve();
const stub = (target: object, method: string, value: unknown) => Object.defineProperty(target, method, { value, configurable: true, writable: true });
type Where = { key?: string | { in: string[] }; ownerId?: string; draftId?: string; state?: string | { in?: string[]; not?: string }; expiresAt?: { lte: Date } };
function matches(row: ImageUpload, where: Where = {}) {
  return (!where.key || (typeof where.key === "string" ? row.key === where.key : where.key.in.includes(row.key)))
    && (where.ownerId === undefined || row.ownerId === where.ownerId) && (where.draftId === undefined || row.draftId === where.draftId)
    && (!where.state || (typeof where.state === "string" ? row.state === where.state : (!where.state.in || where.state.in.includes(row.state)) && row.state !== where.state.not))
    && (!where.expiresAt || row.expiresAt <= where.expiresAt.lte);
}
function change(row: ImageUpload, data: Record<string, unknown>) {
  const attempts = (data.attempts as { increment?: number } | undefined)?.increment;
  const previousAttempts = row.attempts;
  Object.assign(row, data);
  if (attempts) row.attempts = previousAttempts + attempts;
}
function upload(overrides: Partial<ImageUpload> = {}) {
  const key = `products/uploads/${randomUUID()}.webp`;
  const row: ImageUpload = { key, url: `https://images.example.test/${key}`, ownerId: "admin", draftId, state: "PENDING", expiresAt: new Date(Date.now() + 86400000), createdAt: new Date(), updatedAt: new Date(), deletedAt: null, attempts: 0, lastError: null, ...overrides };
  rows.set(row.key, row); objects.add(row.key); return row;
}
function reset() { rows.clear(); objects.clear(); deleted.length = 0; for (const set of [databaseReferences, remoteReferences, categoryReferences, brandReferences]) set.clear(); failRemote = false; failStorage = false; deletionGate = undefined; }

stub(prisma, "$transaction", async (run: (tx: typeof prisma) => Promise<unknown>) => {
  const previous = transactionTail;
  let release!: () => void;
  transactionTail = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  const snapshot = structuredClone([...rows]);
  try { return await run(prisma); }
  catch (error) { rows.clear(); for (const [key, row] of snapshot) rows.set(key, row); throw error; }
  finally { release(); }
});
stub(prisma, "$queryRaw", async () => []);
stub(prisma.imageUpload, "findMany", async ({ where, take }: { where?: Where; take?: number }) => [...rows.values()].filter((row) => matches(row, where)).sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime()).slice(0, take));
stub(prisma.imageUpload, "upsert", async ({ where, create }: { where: { key: string }; create: Partial<ImageUpload> }) => rows.get(where.key) ?? upload(create));
stub(prisma.imageUpload, "update", async ({ where, data }: { where: { key: string }; data: Record<string, unknown> }) => { const row = rows.get(where.key)!; change(row, data); return row; });
stub(prisma.imageUpload, "updateMany", async ({ where, data }: { where: Where; data: Record<string, unknown> }) => { const found = [...rows.values()].filter((row) => matches(row, where)); for (const row of found) change(row, data); return { count: found.length }; });
stub(prisma.productImage, "findMany", async () => [...databaseReferences].map((url) => ({ url })));
stub(prisma.promotion, "findMany", async () => []);
stub(prisma.brand, "findMany", async () => [...brandReferences].map((logoUrl) => ({ logoUrl })));
stub(prisma.category, "findMany", async () => [...categoryReferences].map((image) => ({ image })));
stub(prisma.shopUser, "findUnique", async ({ where }: { where: { googleId: string } }) => ({ googleId: where.googleId, email: `${where.googleId}@example.com`, name: "Test", disabled: false, phone: "", picture: null }));
stub(prisma.adminCredential, "findUnique", async ({ where }: { where: { email: string } }) => where.email === "customer@example.com" ? null : { active: true });
stub(S3Client.prototype, "send", async (command: DeleteObjectCommand) => {
  assert.ok(command instanceof DeleteObjectCommand);
  if (failStorage) throw new Error("R2 unavailable");
  await deletionGate?.();
  objects.delete(command.input.Key!); deleted.push(command.input.Key!); return {};
});
globalThis.fetch = async (url) => {
  if (failRemote) throw new Error("Cannot verify MockAPI");
  if (String(url).endsWith("/products")) return Response.json([{ images: [...remoteReferences] }]);
  return Response.json([...categoryReferences].map((image) => ({ image })));
};

async function request(body: unknown, identity?: string, origin = "http://localhost:3000") {
  const headers: Record<string, string> = { origin, "Content-Type": "application/json" };
  if (identity) headers.cookie = `${SESSION_COOKIE}=${await signAuthToken({ sub: identity, email: `${identity}@example.com`, name: "Test" }, "session", 60)}`;
  return new NextRequest("http://localhost:3000/api/admin/products/images/cleanup", { method: "POST", headers, body: JSON.stringify(body) });
}

test("draft cleanup deletes only unused owned files and preserves every product/brand/category reference", async () => {
  reset();
  const unused = upload(), db = upload(), remote = upload(), category = upload(), brand = upload();
  databaseReferences.add(`${db.url}?version=1`); remoteReferences.add(`${remote.url}#photo`); categoryReferences.add(category.url); brandReferences.add(brand.url);
  const result = await cleanupDraftImages("admin", draftId);
  assert.deepEqual(result, { scanned: 5, deleted: 1, inUse: 4, failed: 0 });
  assert.deepEqual(deleted, [unused.key]); assert.equal(rows.get(unused.key)?.state, "DELETED");
  for (const row of [db, remote, category, brand]) { assert.equal(rows.get(row.key)?.state, "ATTACHED"); assert.ok(objects.has(row.key)); }
});

test("cleanup endpoint checks authentication, origin and draft ownership; arbitrary URL deletion is impossible", async () => {
  reset(); const other = upload({ ownerId: "other" });
  assert.equal((await POST(await request({ draftId }))).status, 401);
  assert.equal((await POST(await request({ draftId }, "customer"))).status, 403);
  assert.equal((await POST(await request({ draftId }, "admin", "https://evil.test"))).status, 403);
  assert.equal((await POST(await request({ draftId: "../other" }, "admin"))).status, 400);
  assert.equal((await POST(await request({ draftId, urls: [other.url] }, "admin"))).status, 200);
  assert.equal(deleted.length, 0); assert.ok(objects.has(other.key));
  assert.equal(managedImageKey("https://evil.test/products/uploads/11111111-1111-4111-8111-111111111111.webp"), null);
  assert.equal(managedImageKey("https://images.example.test/products/uploads/../other.webp"), null);
});

test("unverifiable MockAPI references retain files instead of assuming they are unused", async () => {
  reset(); const image = upload(); failRemote = true;
  await assert.rejects(cleanupDraftImages("admin", draftId));
  assert.equal(deleted.length, 0); assert.ok(objects.has(image.key)); assert.equal(rows.get(image.key)?.state, "PENDING");
});

test("failed R2 deletion is durable, blocks reattachment and succeeds on a later retry", async () => {
  reset(); const image = upload(); failStorage = true;
  assert.equal((await cleanupDraftImages("admin", draftId)).failed, 1);
  assert.equal(rows.get(image.key)?.state, "DELETING"); assert.ok(objects.has(image.key));
  await assert.rejects(withProductImageUploads([image.url], "admin", draftId, async () => "unsafe"), /อัปโหลดใหม่/);
  rows.get(image.key)!.expiresAt = new Date(0); failStorage = false;
  assert.equal((await cleanupExpiredImageUploads()).deleted, 1);
  assert.equal(rows.get(image.key)?.state, "DELETED"); assert.ok(!objects.has(image.key));
  assert.equal(rows.get(image.key)?.attempts, 2);
  await assert.rejects(withProductImageUploads([image.url], "admin", draftId, async () => "unsafe"), /อัปโหลดใหม่/);
});

test("successful saves retain images, cancelled edits retain existing images, and removal deletes only after the last reference", async () => {
  reset(); const image = upload();
  await withProductImageUploads([image.url], "admin", draftId, async () => { databaseReferences.add(image.url); return "saved"; });
  assert.equal(rows.get(image.key)?.state, "ATTACHED");
  assert.equal((await cleanupDraftImages("admin", draftId)).deleted, 0);
  assert.equal((await cleanupRemovedProductImages([image.url])).inUse, 1);
  databaseReferences.delete(image.url); remoteReferences.add(image.url);
  assert.equal((await cleanupRemovedProductImages([image.url])).deleted, 0);
  remoteReferences.delete(image.url);
  assert.equal((await cleanupRemovedProductImages([image.url])).deleted, 1);
});

test("failed saves roll back attachment and another draft cannot claim a private pending upload", async () => {
  reset(); const image = upload();
  await assert.rejects(withProductImageUploads([image.url], "other", draftId, async () => "unsafe"), /ฟอร์มนี้/);
  await assert.rejects(withProductImageUploads([image.url], "admin", draftId, async () => { throw new Error("save failed"); }), /save failed/);
  assert.equal(rows.get(image.key)?.state, "PENDING");
  assert.equal((await cleanupDraftImages("admin", draftId)).deleted, 1);
});

test("abandoned uploads expire after the grace period while recent and referenced images remain", async () => {
  reset(); const old = upload({ expiresAt: new Date(0) }), recent = upload(), used = upload({ state: "ATTACHED", expiresAt: new Date(0) });
  databaseReferences.add(used.url);
  const result = await cleanupExpiredImageUploads();
  assert.equal(result.deleted, 1); assert.equal(result.inUse, 1);
  assert.ok(!objects.has(old.key)); assert.ok(objects.has(recent.key)); assert.ok(objects.has(used.key));
});

test("a save racing with an in-flight deletion cannot create a dangling image reference", async () => {
  reset(); const image = upload();
  let started!: () => void, finish!: () => void;
  const startedPromise = new Promise<void>((resolve) => { started = resolve; });
  const finishPromise = new Promise<void>((resolve) => { finish = resolve; });
  deletionGate = async () => { started(); await finishPromise; };
  const cleanup = cleanupDraftImages("admin", draftId);
  await startedPromise;
  let wrote = false;
  await assert.rejects(withProductImageUploads([image.url], "admin", draftId, async () => { wrote = true; }), /อัปโหลดใหม่/);
  assert.equal(wrote, false); finish(); await cleanup;
  assert.equal(rows.get(image.key)?.state, "DELETED");
});

test("a cleanup racing behind a save observes the committed reference and retains the file", async () => {
  reset(); const image = upload();
  let started!: () => void, finish!: () => void;
  const startedPromise = new Promise<void>((resolve) => { started = resolve; });
  const finishPromise = new Promise<void>((resolve) => { finish = resolve; });
  const save = withProductImageUploads([image.url], "admin", draftId, async () => { started(); await finishPromise; remoteReferences.add(image.url); });
  await startedPromise;
  const cleanup = cleanupRemovedProductImages([image.url]);
  finish(); await save;
  assert.equal((await cleanup).inUse, 1); assert.ok(objects.has(image.key)); assert.equal(deleted.length, 0);
});
