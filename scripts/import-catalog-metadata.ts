import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { catalogRequest } from "../src/lib/admin-products";
import { brandKey, validateCatalogMetadata } from "../src/lib/catalog-metadata";
import type { Category, Product } from "../src/lib/types";

async function main() {
  try {
    const [products, categories] = await Promise.all([catalogRequest<Product[]>("products"), catalogRequest<Category[]>("categories")]);
    if (!Array.isArray(products) || !Array.isArray(categories)) throw new Error("Invalid MockAPI response");
    const brands = new Map<string, string>();
    for (const product of products) if (typeof product.brand === "string" && product.brand.trim()) brands.set(brandKey(product.brand), product.brand.trim());
    const validCategories = categories.filter((row) => row.slug && row.nameTh);
    await prisma.$transaction(async (tx) => {
      for (const name of brands.values()) {
        if (name.length > 100) throw new Error("Brand name too long");
        await tx.brand.upsert({ where: { name }, create: { name }, update: {} });
      }
      for (const row of validCategories) {
        const data = validateCatalogMetadata("category", { ...row, name: row.name || row.nameTh, description: row.description ?? "", image: row.image ?? "" });
        if (!("slug" in data)) throw new Error("Invalid category");
        const { specFields, ...fields } = data; void specFields; // imported categories get their defaults from db:setup-products
        await tx.category.upsert({ where: { slug: fields.slug }, create: fields, update: {} });
      }
    }, { timeout: 60000 });
    console.log(`TiDB metadata ready: ${brands.size} brand names and ${validCategories.length} category definitions synchronized. Existing customizations were preserved. No product rows were copied and MockAPI was not modified.`);
  } finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error("Unable to import brand/category definitions. No MockAPI writes were performed."); process.exitCode = 1; });
