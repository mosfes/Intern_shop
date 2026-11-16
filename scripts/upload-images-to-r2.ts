/**
 * Uploads public/images/products/** to R2, keeping the same layout:
 *   public/images/products/<slug>/1.webp  →  products/<slug>/1.webp
 * Files already in the bucket with the same size are skipped, so re-running is safe.
 * Run: npx tsx scripts/upload-images-to-r2.ts
 */
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { bucket, r2 } from "./r2-client";

const ROOT = path.join(process.cwd(), "public", "images");
const SOURCE = path.join(ROOT, "products");
const CONCURRENCY = 8;

const CONTENT_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((e) => (e.isDirectory() ? listFiles(path.join(dir, e.name)) : [path.join(dir, e.name)])),
  );
  return nested.flat().filter((f) => path.extname(f).toLowerCase() in CONTENT_TYPES);
}

async function remoteSize(key: string): Promise<number | null> {
  try {
    const head = await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return head.ContentLength ?? null;
  } catch {
    return null;
  }
}

async function main() {
  const files = await listFiles(SOURCE);
  let uploaded = 0;
  let skipped = 0;

  const queue = [...files];
  async function worker() {
    for (let file = queue.shift(); file; file = queue.shift()) {
      const key = path.relative(ROOT, file).split(path.sep).join("/");
      const { size } = await stat(file);
      if ((await remoteSize(key)) === size) {
        skipped++;
        continue;
      }
      await r2.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: await readFile(file),
          ContentType: CONTENT_TYPES[path.extname(file).toLowerCase()],
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
      uploaded++;
      console.log(`↑ ${key}`);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`\nDone: ${uploaded} uploaded, ${skipped} already up to date, ${files.length} total.`);
}

main().catch((e) => {
  console.error("✗", e.name, e.message);
  process.exit(1);
});
