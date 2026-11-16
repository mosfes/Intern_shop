/**
 * Builds the JSON to put on mockapi.io from src/data, with image paths rewritten to
 * full R2 URLs (NEXT_PUBLIC_IMAGE_BASE_URL + /products/<slug>/<n>.webp).
 *   output/mockapi/products.json    → resource "products"
 *   output/mockapi/categories.json  → resource "categories"
 * mockapi assigns its own `id`, so ours is dropped; `slug` is the stable key.
 * Run: npx tsx scripts/export-mockapi-json.ts
 */
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { categories } from "@/data/categories";
import { products } from "@/data/products";

const base = process.env.NEXT_PUBLIC_IMAGE_BASE_URL?.replace(/\/$/, "");
if (!base) throw new Error("Missing NEXT_PUBLIC_IMAGE_BASE_URL in .env");

/** "/images/products/x/1.webp" → "https://pub-….r2.dev/products/x/1.webp" */
function toR2(localPath: string): string {
  const key = localPath.replace(/^\/images\//, "");
  if (key === localPath) throw new Error(`Not an /images/ path: ${localPath}`);
  return `${base}/${key}`;
}

async function main() {
  const outDir = path.join(process.cwd(), "output", "mockapi");
  await mkdir(outDir, { recursive: true });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- mockapi assigns its own id
  const productJson = products.map(({ id, images, ...rest }) => ({
    ...rest,
    images: images.map(toR2),
  }));
  const categoryJson = categories.map((c) => ({ ...c, image: toR2(c.image) }));

  await writeFile(path.join(outDir, "products.json"), JSON.stringify(productJson, null, 2));
  await writeFile(path.join(outDir, "categories.json"), JSON.stringify(categoryJson, null, 2));
  console.log(`✓ ${productJson.length} products, ${categoryJson.length} categories → output/mockapi/`);
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
