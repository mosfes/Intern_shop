import "dotenv/config";
import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import sharp from "sharp";
import { NextRequest } from "next/server";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { POST } from "../src/app/api/admin/products/images/route";
import { MAX_PRODUCT_IMAGE_BYTES } from "../src/lib/product-image-policy";
import { prepareProductImage } from "../src/lib/product-image-upload";
import { prisma } from "../src/lib/prisma";
import { SESSION_COOKIE, signAuthToken } from "../src/lib/google-auth";

Object.assign(process.env, { AUTH_URL: "http://localhost:3000", AUTH_SECRET: "test-session-secret-at-least-32-characters", R2_ACCOUNT_ID: "test-account", R2_BUCKET: "test-bucket", R2_ACCESS_KEY_ID: "test-key", R2_SECRET_ACCESS_KEY: "test-secret", NEXT_PUBLIC_IMAGE_BASE_URL: "https://images.example.test" });
const stub = (target: object, method: string, value: unknown) => Object.defineProperty(target, method, { value, configurable: true, writable: true });
stub(prisma.shopUser, "findUnique", async ({ where }: { where: { googleId: string } }) => ({ googleId: where.googleId, email: `${where.googleId}@example.com`, name: "Test", disabled: where.googleId === "disabled", phone: "", picture: null }));
stub(prisma.adminCredential, "findUnique", async ({ where }: { where: { email: string } }) => where.email === "customer@example.com" ? null : { active: true, passwordHash: "hash", mustChangePassword: where.email === "reset@example.com", version: 1 });
const require = createRequire(import.meta.url);
require("next/server").after = () => {};
const reservations: { key: string; ownerId: string; draftId: string }[] = [];
stub(prisma.imageUpload, "create", async ({ data }: { data: typeof reservations[number] }) => { reservations.push(data); return data; });
const writes: PutObjectCommand[] = [];
let failStorage = false;
stub(S3Client.prototype, "send", async (command: PutObjectCommand) => {
  if (failStorage) throw new Error("secret storage configuration");
  writes.push(command); return {};
});

function file(bytes: Uint8Array | string, type = "image/png", name = "photo.png") {
  return new File([typeof bytes === "string" ? bytes : new Uint8Array(bytes)], name, { type });
}
async function request(image?: File, identity?: string, origin = "http://localhost:3000", custom?: { body: Uint8Array; headers: Record<string, string> }) {
  const headers: Record<string, string> = { origin, ...custom?.headers };
  if (identity) headers.cookie = `${SESSION_COOKIE}=${await signAuthToken({ sub: identity, email: `${identity}@example.com`, name: "Test", ...(identity === "reset" ? { authMethod: "password", credentialVersion: 1 } : {}) }, "session", 60)}`;
  const form = new FormData(); form.set("draftId", "11111111-1111-4111-8111-111111111111"); if (image) form.set("file", image);
  return new NextRequest("http://localhost:3000/api/admin/products/images", { method: "POST", headers, body: custom ? new Uint8Array(custom.body) : form });
}

test("image upload enforces admin membership, account status, password change and origin before storage access", async () => {
  assert.equal((await POST(await request())).status, 401);
  assert.equal((await POST(await request(undefined, "customer"))).status, 403);
  assert.equal((await POST(await request(undefined, "disabled"))).status, 401);
  assert.equal((await POST(await request(undefined, "reset"))).status, 403);
  assert.equal((await POST(await request(undefined, "admin", "https://evil.test"))).status, 403);
  assert.equal(writes.length, 0);
});

test("a real raster image uploads as WebP using a generated key and public URL", async () => {
  const bytes = await sharp({ create: { width: 32, height: 16, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 0.5 } } }).png().toBuffer();
  const response = await POST(await request(file(bytes, "image/png", "../../unsafe-name.png"), "admin"));
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const { image } = await response.json();
  assert.match(image.url, /^https:\/\/images\.example\.test\/products\/uploads\/[a-f0-9-]+\.webp$/);
  assert.equal(image.width, 32); assert.equal(image.height, 16);
  assert.equal(writes.length, 1);
  assert.equal(reservations[0].ownerId, "admin");
  assert.equal(reservations[0].draftId, "11111111-1111-4111-8111-111111111111");
  const uploaded = writes[0].input;
  assert.equal(uploaded.Bucket, "test-bucket"); assert.equal(uploaded.ContentType, "image/webp");
  assert.ok(!uploaded.Key?.includes("unsafe-name"));
  const metadata = await sharp(uploaded.Body as Buffer).metadata();
  assert.equal(metadata.format, "webp"); assert.equal(metadata.hasAlpha, true);
});

test("large dimensions are resized and metadata is removed without enlarging small photos", async () => {
  const bytes = await sharp({ create: { width: 3000, height: 100, channels: 3, background: "white" } }).withMetadata().png().toBuffer();
  const prepared = await prepareProductImage(file(bytes));
  const metadata = await sharp(prepared.data).metadata();
  assert.equal(metadata.width, 2560); assert.ok(metadata.height! < 100);
  assert.equal(metadata.exif, undefined);
});

test("invalid, empty, oversized and disguised SVG files are rejected without R2 writes", async () => {
  const count = writes.length;
  const samples = [file("", "image/png"), file("not an image"), file("<svg></svg>", "image/svg+xml"), file('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>', "image/png")];
  for (const image of samples) assert.equal((await POST(await request(image, "admin"))).status, 400);
  assert.equal((await POST(await request(file(new Uint8Array(MAX_PRODUCT_IMAGE_BYTES + 1)), "admin"))).status, 413);
  const streamRequest = await request(undefined, "admin", undefined, { body: new Uint8Array(MAX_PRODUCT_IMAGE_BYTES + 70_000), headers: { "content-type": "multipart/form-data; boundary=test" } });
  assert.equal((await POST(streamRequest)).status, 413);
  assert.equal(writes.length, count);
});

test("malformed forms and storage failures return useful errors without leaking internal details", async () => {
  assert.equal((await POST(await request(undefined, "admin"))).status, 400);
  const malformed = await request(undefined, "admin", undefined, { body: new Uint8Array([1, 2, 3]), headers: { "content-type": "multipart/form-data; boundary=test" } });
  assert.equal((await POST(malformed)).status, 400);
  const bytes = await sharp({ create: { width: 8, height: 8, channels: 3, background: "white" } }).png().toBuffer();
  failStorage = true;
  const failed = await POST(await request(file(bytes), "admin"));
  assert.equal(failed.status, 503);
  assert.ok(!JSON.stringify(await failed.json()).includes("secret"));
  failStorage = false;
});
