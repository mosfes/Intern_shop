import "dotenv/config";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { prisma } from "../src/lib/prisma";
import { cleanupExpiredImageUploads, inspectUnusedImageUrls } from "../src/lib/product-image-lifecycle";
import { MANAGED_IMAGE_KEY, productImageStorage } from "../src/lib/r2-storage";

async function olderUntrackedUploads() {
  const { client, bucket, base } = productImageStorage();
  let cursor: string | undefined;
  const uploads: { key: string; url: string; createdAt: Date; expiresAt: Date }[] = [];
  try {
    do {
      const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: "products/uploads/", ContinuationToken: cursor }));
      for (const item of page.Contents ?? []) {
        if (!item.Key || !MANAGED_IMAGE_KEY.test(item.Key) || !item.LastModified || item.LastModified.getTime() > Date.now() - 24 * 60 * 60 * 1000) continue;
        if (await prisma.imageUpload.findUnique({ where: { key: item.Key }, select: { key: true } })) continue;
        uploads.push({ key: item.Key, url: `${base}/${item.Key}`, createdAt: item.LastModified, expiresAt: new Date(item.LastModified.getTime() + 24 * 60 * 60 * 1000) });
      }
      cursor = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (cursor);
  } finally { client.destroy(); }
  return uploads;
}

async function main() {
  try {
    const older = process.argv.includes("--scan-existing") ? await olderUntrackedUploads() : [];
    if (process.argv.includes("--dry-run")) {
      const tracked = await prisma.imageUpload.findMany({ where: { state: { not: "DELETED" }, expiresAt: { lte: new Date() } }, select: { url: true } });
      const urls = [...new Set([...older.map((row) => row.url), ...tracked.map((row) => row.url)])];
      const unused = await inspectUnusedImageUrls(urls);
      console.log(`READ-ONLY preview: ${urls.length} eligible uploads; ${unused.length} unreferenced; ${urls.length - unused.length} in use. No files or database records were changed.`);
      return;
    }
    for (const data of older) await prisma.imageUpload.create({ data });
    if (older.length) console.log(`Registered ${older.length} older managed uploads for reference checking.`);
    let deleted = 0, inUse = 0, failed = 0;
    for (let batch = 0; batch < 20; batch++) {
      const result = await cleanupExpiredImageUploads();
      deleted += result.deleted; inUse += result.inUse; failed += result.failed;
      if (!result.scanned) break;
    }
    console.log(`Image cleanup finished: ${deleted} deleted, ${inUse} retained in use, ${failed} queued for retry.`);
    if (failed) process.exitCode = 1;
  } finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error("Cleanup stopped because image references could not be verified. Files were retained."); process.exitCode = 1; });
