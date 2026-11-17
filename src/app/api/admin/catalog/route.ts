import type { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { adminJson, authorizeAdmin, authorizeAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { catalogRequest } from "@/lib/admin-products";
import { buildCatalogDirectory, CatalogMetadataError, toSpecFields, validateCatalogMetadata } from "@/lib/catalog-metadata";
import { CATALOG_TAG } from "@/lib/catalog-server";
import { afterImageCleanup, cleanupDraftImages, cleanupRemovedProductImages, validImageDraftId, withProductImageUploads } from "@/lib/product-image-lifecycle";
import { ProductImageError } from "@/lib/product-image-upload";
import type { Prisma } from "@/generated/prisma/client";
import type { Product } from "@/lib/types";

async function loadDirectory() {
  const [products, storedBrands, storedCategories] = await Promise.all([
    catalogRequest<Product[]>("products"),
    prisma.brand.findMany({ include: { _count: { select: { products: true } } } }),
    prisma.category.findMany({ include: { _count: { select: { products: true } }, specFields: { orderBy: { position: "asc" } } } }),
  ]);
  if (!Array.isArray(products)) throw new Error("Invalid catalogue");
  return buildCatalogDirectory(products, storedBrands, storedCategories);
}

function failure(error: unknown) {
  if (error instanceof CatalogMetadataError || error instanceof ProductImageError) return adminJson({ error: error.message }, error.status);
  if (error && typeof error === "object" && "code" in error) {
    if (error.code === "P2002") return adminJson({ error: "ชื่อหรือรหัสนี้มีอยู่แล้ว" }, 409);
    if (error.code === "P2003") return adminJson({ error: "ยังมีสินค้าใช้รายการนี้อยู่ จึงลบไม่ได้" }, 409);
    if (error.code === "P2025") return adminJson({ error: "ไม่พบรายการ" }, 404);
  }
  return adminJson({ error: "จัดการข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง" }, 503);
}

export async function GET(request: NextRequest) {
  try {
    const denied = await authorizeAdmin(request);
    if (denied) return denied;
    return adminJson(await loadDirectory());
  } catch (error) { return failure(error); }
}

async function mutate(request: NextRequest, method: "POST" | "PUT" | "DELETE") {
  try {
    const { user, denied } = await authorizeAdminSession(request, true);
    if (denied) return denied;
    let body;
    try { body = await request.json(); } catch { return adminJson({ error: "ข้อมูลไม่ถูกต้อง" }, 400); }
    if (!body || typeof body !== "object" || Array.isArray(body) || (body.kind !== "brand" && body.kind !== "category")) return adminJson({ error: "ข้อมูลไม่ถูกต้อง" }, 400);
    const directory = await loadDirectory();
    const records = body.kind === "brand" ? directory.brands : directory.categories;
    const existing = method === "POST" ? undefined : records.find((row) => row.id === body.id && row.source === "tidb");
    if (method !== "POST" && !existing) return adminJson({ error: "ไม่พบรายการนี้" }, 404);
    const oldImage = existing ? ("logoUrl" in existing ? existing.logoUrl : existing.image) : null;
    if (method === "DELETE") {
      if (existing!.productCount) return adminJson({ error: "ยังมีสินค้าใช้รายการนี้อยู่ จึงลบไม่ได้" }, 409);
      if (body.kind === "brand") await prisma.brand.delete({ where: { id: existing!.id } });
      else await prisma.category.delete({ where: { id: existing!.id } });
      revalidateTag(CATALOG_TAG, { expire: 0 });
      if (oldImage) afterImageCleanup(() => cleanupRemovedProductImages([oldImage]));
      return adminJson({ ok: true });
    }
    const data = validateCatalogMetadata(body.kind, body);
    if (existing && "logoUrl" in existing && "logoUrl" in data && existing.mockapiProductCount > 0 && existing.name !== data.name) return adminJson({ error: "ชื่อนี้มีสินค้า MockAPI อ้างอิงอยู่ จึงเปลี่ยนชื่อไม่ได้ แต่ยังแก้ไขโลโก้ได้" }, 409);
    if (existing && "slug" in existing && "slug" in data && data.slug !== existing.slug) return adminJson({ error: "รหัสหมวดหมู่เปลี่ยนไม่ได้ เพื่อคงการเชื่อมโยงกับสินค้า" }, 400);
    const image = "logoUrl" in data ? data.logoUrl : data.image;
    const record = await withProductImageUploads(image ? [image] : [], user.googleId, body.draftId, async (tx) => {
      const db = tx ?? prisma;
      if ("logoUrl" in data) {
        const row = existing ? await db.brand.update({ where: { id: existing.id }, data }) : await db.brand.create({ data });
        const old = directory.brands.find((entry) => entry.name.toLocaleLowerCase() === row.name.toLocaleLowerCase());
        return { ...row, source: "tidb" as const, productCount: old?.productCount ?? existing?.productCount ?? 0, mockapiProductCount: old?.mockapiProductCount ?? 0 };
      }
      const { specFields, ...fields } = data;
      // The category row and its default spec rows must change together.
      const write = async (client: Prisma.TransactionClient) => {
        const row = existing ? await client.category.update({ where: { id: existing.id }, data: fields }) : await client.category.create({ data: fields });
        if (specFields) {
          await client.categorySpecField.deleteMany({ where: { categoryId: row.id } });
          if (specFields.length) await client.categorySpecField.createMany({ data: specFields.map((field, position) => ({ categoryId: row.id, label: field.label, example: field.example, compatibility: !!field.compatibility, powerAdvice: !!field.powerAdvice, position })) });
        }
        return { row, specFields: specFields ?? existing?.specFields ?? toSpecFields(await client.categorySpecField.findMany({ where: { categoryId: row.id } })) };
      };
      const { row, specFields: savedFields } = tx ? await write(tx) : await prisma.$transaction(write);
      const old = directory.categories.find((entry) => entry.slug === row.slug);
      return { ...row, specFields: savedFields, source: "tidb" as const, productCount: old?.productCount ?? 0, mockapiProductCount: old?.mockapiProductCount ?? 0 };
    });
    revalidateTag(CATALOG_TAG, { expire: 0 });
    afterImageCleanup(async () => {
      if (oldImage && oldImage !== image) await cleanupRemovedProductImages([oldImage]);
      if (validImageDraftId(body.draftId)) await cleanupDraftImages(user.googleId, body.draftId);
    });
    return adminJson({ record }, method === "POST" ? 201 : 200);
  } catch (error) { return failure(error); }
}

export const POST = (request: NextRequest) => mutate(request, "POST");
export const PUT = (request: NextRequest) => mutate(request, "PUT");
export const DELETE = (request: NextRequest) => mutate(request, "DELETE");
