import { after } from "next/server";
import { Prisma, type ImageUpload } from "@/generated/prisma/client";
import { prisma } from "./prisma";
import { catalogRequest } from "./admin-products";
import { ProductImageError } from "./product-image-upload";
import { deleteProductImageObject, managedImageKey } from "./r2-storage";
import type { Category, Product } from "./types";

const DAY = 24 * 60 * 60 * 1000;
const RETRY = 5 * 60 * 1000;
const transactionOptions = { timeout: 60000, maxWait: 10000, isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted };
export const validImageDraftId = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);

function managedPairs(urls: string[]) {
  const base = process.env.NEXT_PUBLIC_IMAGE_BASE_URL?.replace(/\/+$/, "");
  return [...new Map(urls.flatMap((url) => { const key = managedImageKey(url); return key ? [[key, { key, url: `${base}/${key}` }] as const] : []; })).values()].sort((a, b) => a.key.localeCompare(b.key));
}

async function lockUploads(tx: Prisma.TransactionClient, keys: string[]) {
  if (!keys.length) return [];
  await tx.$queryRaw(Prisma.sql`SELECT \`key\` FROM ImageUpload WHERE \`key\` IN (${Prisma.join([...keys].sort())}) ORDER BY \`key\` FOR UPDATE`);
  return tx.imageUpload.findMany({ where: { key: { in: keys } } });
}

async function referencedUrls(tx: Prisma.TransactionClient, urls: string[]) {
  if (!urls.length) return new Set<string>();
  // A failed source lookup must abort cleanup, never be interpreted as an empty catalogue.
  const [images, brands, categories, promotions, remoteProducts, remoteCategories] = await Promise.all([
    tx.productImage.findMany({ where: { OR: urls.map((url) => ({ url: { startsWith: url } })) }, select: { url: true } }),
    tx.brand.findMany({ where: { OR: urls.map((url) => ({ logoUrl: { startsWith: url } })) }, select: { logoUrl: true } }),
    tx.category.findMany({ where: { OR: urls.map((url) => ({ image: { startsWith: url } })) }, select: { image: true } }),
    tx.promotion.findMany({ where: { OR: urls.map((url) => ({ image: { startsWith: url } })) }, select: { image: true } }),
    catalogRequest<Product[]>("products"), catalogRequest<Category[]>("categories"),
  ]);
  if (!Array.isArray(remoteProducts) || !Array.isArray(remoteCategories)) throw new Error("Cannot verify remote references");
  const references = [
    ...images.map((row) => row.url), ...brands.flatMap((row) => row.logoUrl ? [row.logoUrl] : []), ...categories.map((row) => row.image), ...promotions.map((row) => row.image),
    ...remoteProducts.flatMap((product) => Array.isArray(product.images) ? product.images : typeof product.images === "string" ? [product.images] : []),
    ...remoteCategories.map((category) => category.image),
  ];
  const usedKeys = new Set(references.map((url) => typeof url === "string" ? managedImageKey(url) : null).filter(Boolean));
  return new Set(urls.filter((url) => usedKeys.has(managedImageKey(url))));
}

/** Read-only preview; no state changes, locks, or R2 deletions. */
export async function inspectUnusedImageUrls(urls: string[]) {
  const pairs = managedPairs(urls);
  const used = await referencedUrls(prisma, pairs.map((pair) => pair.url));
  return pairs.filter((pair) => !used.has(pair.url)).map((pair) => pair.url);
}

/** Serialize product saves against deletion. Deleted keys are retained as tombstones. */
export async function withProductImageUploads<T>(urls: string[], ownerId: string, draftId: unknown, write: (tx?: Prisma.TransactionClient) => Promise<T>) {
  const pairs = managedPairs(urls);
  if (!pairs.length) return write();
  return prisma.$transaction(async (tx) => {
    for (const pair of pairs) await tx.imageUpload.upsert({ where: { key: pair.key }, create: { ...pair, state: "ATTACHED", expiresAt: new Date(Date.now() + DAY) }, update: {} });
    const rows = await lockUploads(tx, pairs.map((pair) => pair.key));
    if (rows.some((row) => row.state === "DELETING" || row.state === "DELETED")) throw new ProductImageError("รูปภาพบางรูปถูกล้างแล้ว กรุณาอัปโหลดใหม่", 409);
    const foreignPending = rows.filter((row) => row.state === "PENDING" && (row.ownerId !== ownerId || row.draftId !== draftId));
    if (foreignPending.length) {
      const used = await referencedUrls(tx, foreignPending.map((row) => row.url));
      if (foreignPending.some((row) => !used.has(row.url))) throw new ProductImageError("รูปภาพไม่ได้อยู่ในฟอร์มนี้ กรุณาอัปโหลดใหม่", 400);
    }
    const result = await write(tx);
    await tx.imageUpload.updateMany({ where: { key: { in: pairs.map((pair) => pair.key) } }, data: { state: "ATTACHED", expiresAt: new Date(Date.now() + DAY), lastError: null } });
    return result;
  }, transactionOptions);
}

type CleanupScope = { kind: "draft"; ownerId: string; draftId: string } | { kind: "expired" } | { kind: "removed" };
type CleanupResult = { scanned: number; deleted: number; inUse: number; failed: number };

function eligible(row: ImageUpload, scope: CleanupScope, now: Date) {
  if (row.state === "DELETED") return false;
  if (row.state === "DELETING" && row.expiresAt > now) return false;
  if (scope.kind === "draft") return row.ownerId === scope.ownerId && row.draftId === scope.draftId && row.state !== "ATTACHED";
  return scope.kind === "removed" || row.expiresAt <= now;
}

async function cleanupKeys(keys: string[], scope: CleanupScope): Promise<CleanupResult> {
  const result: CleanupResult = { scanned: 0, deleted: 0, inUse: 0, failed: 0 };
  if (!keys.length) return result;
  const claimed = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const rows = (await lockUploads(tx, keys)).filter((row) => eligible(row, scope, now));
    result.scanned = rows.length;
    const used = await referencedUrls(tx, rows.map((row) => row.url));
    const unused: string[] = [];
    for (const row of rows) {
      if (used.has(row.url)) {
        result.inUse++;
        await tx.imageUpload.update({ where: { key: row.key }, data: { state: "ATTACHED", expiresAt: new Date(Date.now() + DAY), lastError: null } });
      } else {
        // Commit the deletion intent before touching R2. Concurrent saves must reject this key.
        await tx.imageUpload.update({ where: { key: row.key }, data: { state: "DELETING", expiresAt: new Date(Date.now() + RETRY) } });
        unused.push(row.key);
      }
    }
    return unused;
  }, transactionOptions);
  await Promise.all(claimed.map(async (key) => {
    try {
      await deleteProductImageObject(key);
      await prisma.imageUpload.updateMany({ where: { key, state: "DELETING" }, data: { state: "DELETED", deletedAt: new Date(), lastError: null, attempts: { increment: 1 } } });
      result.deleted++;
    } catch {
      result.failed++;
      // Also retries a successful R2 deletion whose database acknowledgement was lost.
      await prisma.imageUpload.updateMany({ where: { key, state: "DELETING" }, data: { expiresAt: new Date(Date.now() + RETRY), lastError: "Image deletion will be retried", attempts: { increment: 1 } } });
    }
  }));
  return result;
}

export async function cleanupDraftImages(ownerId: string, draftId: string, urls?: string[]) {
  const keys = urls ? managedPairs(urls).map((pair) => pair.key) : undefined;
  const rows = await prisma.imageUpload.findMany({ where: { ownerId, draftId, state: { in: ["PENDING", "DELETING"] }, ...(keys ? { key: { in: keys } } : {}) }, select: { key: true }, take: 100 });
  return cleanupKeys(rows.map((row) => row.key), { kind: "draft", ownerId, draftId });
}

export async function cleanupRemovedProductImages(urls: string[]) {
  const pairs = managedPairs(urls);
  for (const pair of pairs) await prisma.imageUpload.upsert({ where: { key: pair.key }, create: { ...pair, state: "ATTACHED", expiresAt: new Date() }, update: {} });
  const keys = pairs.map((pair) => pair.key);
  return cleanupKeys(keys, { kind: "removed" });
}

export async function cleanupExpiredImageUploads(limit = 20) {
  const rows = await prisma.imageUpload.findMany({ where: { state: { not: "DELETED" }, expiresAt: { lte: new Date() } }, orderBy: { expiresAt: "asc" }, take: limit, select: { key: true } });
  return cleanupKeys(rows.map((row) => row.key), { kind: "expired" });
}

export function afterImageCleanup(work: () => Promise<unknown>) {
  after(async () => { try { await work(); } catch { console.error("Image cleanup deferred; pending uploads remain tracked for retry."); } });
}
