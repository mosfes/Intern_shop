import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./prisma";
import type { ProductInput } from "./product-management";
import { specificationHighlight } from "./product-highlights";
import type { Category, Product, ProductTag, Review } from "./types";

export const databaseProductInclude = {
  brand: true, category: true,
  images: { orderBy: { position: "asc" } },
  specifications: { orderBy: { position: "asc" } },
  highlights: { orderBy: { position: "asc" } },
  shortSpecs: { orderBy: { position: "asc" } },
  tags: { orderBy: { tag: "asc" } },
  reviews: { orderBy: { position: "asc" } },
} satisfies Prisma.ProductInclude;

export type StoredProduct = Prisma.ProductGetPayload<{ include: typeof databaseProductInclude }>;

export function fromDatabaseProduct(row: StoredProduct): Product & { source: "tidb" } {
  const price = Number(row.price);
  const originalPrice = Number(row.originalPrice);
  return {
    id: row.id, source: "tidb", slug: row.slug, name: row.name,
    brand: row.brand.name, category: row.category.slug,
    price, originalPrice, discount: originalPrice > 0 ? Math.round((1 - price / originalPrice) * 100) : 0,
    stock: row.stock, description: row.description, warranty: row.warranty,
    rating: row.rating, reviewCount: row.reviewCount,
    images: row.images.map((image) => image.url),
    specifications: row.specifications.map(({ label, value }) => ({ label, value })),
    highlights: [...new Set([
      ...row.specifications.filter((spec) => spec.isHighlighted).map(specificationHighlight),
      ...row.highlights.map((highlight) => highlight.text),
    ])],
    shortSpecs: row.shortSpecs.map((spec) => spec.text), tags: row.tags.map((tag) => tag.tag as ProductTag),
    reviews: row.reviews.map(({ id, author, rating, date, title, body, verified }) => ({ id, author, rating, date, title, body, verified })),
  };
}

function fields(input: ProductInput) {
  return { slug: input.slug, name: input.name, price: input.price, originalPrice: input.originalPrice, stock: input.stock, description: input.description, warranty: input.warranty };
}

function children(input: ProductInput) {
  const specHighlights = new Set(input.specifications.map(specificationHighlight));
  return {
    images: input.images.map((url, position) => ({ url, position })),
    specifications: input.specifications.map((spec, position) => ({ ...spec, position, isHighlighted: input.highlights.includes(specificationHighlight(spec)) })),
    highlights: input.highlights.filter((text) => !specHighlights.has(text)).map((text, position) => ({ text, position })),
    shortSpecs: input.shortSpecs.map((text, position) => ({ text, position })),
    tags: input.tags.map((tag) => ({ tag })),
  };
}

async function references(tx: Prisma.TransactionClient, input: ProductInput, category: Category) {
  const brand = await tx.brand.upsert({ where: { name: input.brand }, create: { name: input.brand }, update: {} });
  const storedCategory = await tx.category.upsert({ where: { slug: input.category }, create: {
    slug: category.slug, name: category.name, nameTh: category.nameTh, description: category.description, image: category.image,
  }, update: {} });
  return { brandId: brand.id, categoryId: storedCategory.id };
}

export async function createDatabaseProduct(input: ProductInput, category: Category, previous?: { id: string; rating: number; reviewCount: number; reviews: Review[] }, client?: Prisma.TransactionClient) {
  const nested = children(input);
  const write = async (tx: Prisma.TransactionClient) => {
    const refs = await references(tx, input, category);
    return tx.product.create({ data: {
      id: previous?.id ?? `tidb_${randomUUID()}`, ...fields(input), ...refs,
      rating: previous?.rating ?? 0, reviewCount: previous?.reviewCount ?? 0,
      images: { create: nested.images }, specifications: { create: nested.specifications },
      highlights: { create: nested.highlights }, shortSpecs: { create: nested.shortSpecs }, tags: { create: nested.tags },
      reviews: { create: (previous?.reviews ?? []).map((review, position) => ({ ...review, position })) },
    }, include: databaseProductInclude });
  };
  const row = client ? await write(client) : await prisma.$transaction(write);
  return fromDatabaseProduct(row);
}

export async function updateDatabaseProduct(id: string, input: ProductInput, category: Category, client?: Prisma.TransactionClient) {
  const nested = children(input);
  const write = async (tx: Prisma.TransactionClient) => {
    const refs = await references(tx, input, category);
    // Nested replacement is atomic; ratings and reviews remain untouched.
    return tx.product.update({ where: { id }, data: {
      ...fields(input), ...refs,
      images: { deleteMany: {}, create: nested.images }, specifications: { deleteMany: {}, create: nested.specifications },
      highlights: { deleteMany: {}, create: nested.highlights }, shortSpecs: { deleteMany: {}, create: nested.shortSpecs }, tags: { deleteMany: {}, create: nested.tags },
    }, include: databaseProductInclude });
  };
  const row = client ? await write(client) : await prisma.$transaction(write);
  return fromDatabaseProduct(row);
}
