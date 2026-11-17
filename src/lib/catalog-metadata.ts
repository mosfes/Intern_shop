import type { Category, CategorySpecField, Product } from "./types";
import { MAX_CATEGORY_SPEC_FIELDS } from "./product-specification-templates";

export type CatalogKind = "brand" | "category";
export type CatalogBrand = { id: string; name: string; logoUrl: string | null; source: "tidb"; productCount: number; mockapiProductCount: number };
export type CatalogCategory = Category & { id: string; source: "tidb"; productCount: number; mockapiProductCount: number };
export type CatalogDirectory = { brands: CatalogBrand[]; categories: CatalogCategory[] };
export const DEFAULT_CATEGORY_IMAGE = "/images/categories/default.svg";
export const brandKey = (name: string) => name.trim().normalize("NFKC").toLocaleLowerCase();

type StoredSpecField = { label: string; example: string; compatibility: boolean; powerAdvice: boolean; position: number };

/** Database rows → plain fields, in the order the admin arranged them. */
export function toSpecFields(rows: StoredSpecField[] | undefined): CategorySpecField[] {
  return [...(rows ?? [])].sort((a, b) => a.position - b.position).map(({ label, example, compatibility, powerAdvice }) => ({
    label, example, ...(compatibility ? { compatibility } : {}), ...(powerAdvice ? { powerAdvice } : {}),
  }));
}

export function storedCategories<T extends { image: string }>(stored: T[]) {
  return stored.map((row) => ({ ...row, image: row.image || DEFAULT_CATEGORY_IMAGE }));
}

export function buildCatalogDirectory(
  remoteProducts: Product[],
  brands: { id: string; name: string; logoUrl: string | null; _count: { products: number } }[],
  categories: (Omit<Category, "specFields"> & { id: string; specFields?: StoredSpecField[]; _count: { products: number } })[],
): CatalogDirectory {
  const brandCounts = new Map<string, number>(), categoryCounts = new Map<string, number>();
  for (const product of remoteProducts) {
    if (product.brand?.trim()) { const key = brandKey(product.brand); brandCounts.set(key, (brandCounts.get(key) ?? 0) + 1); }
    if (product.category) categoryCounts.set(product.category, (categoryCounts.get(product.category) ?? 0) + 1);
  }
  return {
    brands: brands.map((row) => ({ id: row.id, name: row.name, logoUrl: row.logoUrl, source: "tidb" as const, productCount: row._count.products + (brandCounts.get(brandKey(row.name)) ?? 0), mockapiProductCount: brandCounts.get(brandKey(row.name)) ?? 0 })).sort((a, b) => a.name.localeCompare(b.name)),
    categories: categories.map((row) => ({ id: row.id, slug: row.slug, name: row.name, nameTh: row.nameTh, description: row.description, image: row.image || DEFAULT_CATEGORY_IMAGE, specFields: toSpecFields(row.specFields), source: "tidb" as const, productCount: row._count.products + (categoryCounts.get(row.slug) ?? 0), mockapiProductCount: categoryCounts.get(row.slug) ?? 0 })).sort((a, b) => a.nameTh.localeCompare(b.nameTh, "th")),
  };
}

export class CatalogMetadataError extends Error { constructor(message: string, public status = 400) { super(message); } }

export function validateCatalogMetadata(kind: CatalogKind, body: Record<string, unknown>): { name: string; logoUrl: string | null } | Category {
  function text(key: string, max: number, required = false) {
    const value = body[key] ?? "";
    if (typeof value !== "string" || value.trim().length > max || (required && !value.trim())) throw new CatalogMetadataError("กรุณากรอกข้อมูลให้ครบและไม่เกินความยาวที่กำหนด");
    return value.trim();
  }
  function image(key: string) {
    const value = text(key, 2048);
    const base = process.env.NEXT_PUBLIC_IMAGE_BASE_URL?.replace(/\/+$/, "");
    if (value && !(/^\/(?!\/)[^\s\\]+$/.test(value) || (base && value.startsWith(`${base}/`) && !/[\s\\]/.test(value)))) throw new CatalogMetadataError("กรุณาใช้รูปที่อัปโหลดหรือรูปในเว็บไซต์");
    return value;
  }
  if (kind === "brand") return { name: text("name", 100, true), logoUrl: image("logoUrl") || null };
  const slug = text("slug", 180, true);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new CatalogMetadataError("รหัสหมวดหมู่ใช้อักษรอังกฤษตัวเล็ก ตัวเลข และขีดกลาง");
  const nameTh = text("nameTh", 255, true);
  return { slug, name: text("name", 255) || nameTh, nameTh, description: text("description", 2000), image: image("image") || DEFAULT_CATEGORY_IMAGE, specFields: specFields(body.specFields) };
}

/** `undefined` means "leave the saved defaults alone"; an array replaces them. */
function specFields(value: unknown): CategorySpecField[] | undefined {
  if (value === undefined) return undefined;
  const bad = () => new CatalogMetadataError("กรุณาตรวจสอบสเปกเริ่มต้นของหมวดหมู่ (ชื่อสเปกไม่เกิน 120 ตัวอักษร ตัวอย่างไม่เกิน 255 ตัวอักษร)");
  if (!Array.isArray(value) || value.length > MAX_CATEGORY_SPEC_FIELDS) throw bad();
  const seen = new Set<string>();
  return value.map((entry) => {
    if (!entry || typeof entry !== "object") throw bad();
    const { label, example = "", compatibility, powerAdvice } = entry as Record<string, unknown>;
    if (typeof label !== "string" || typeof example !== "string" || !label.trim() || label.trim().length > 120 || example.trim().length > 255) throw bad();
    const key = label.trim().toLowerCase();
    if (seen.has(key)) throw new CatalogMetadataError(`ชื่อสเปก “${label.trim()}” ซ้ำกัน กรุณาใช้ชื่อไม่ซ้ำ`);
    seen.add(key);
    return { label: label.trim(), example: example.trim(), ...(compatibility === true ? { compatibility: true } : {}), ...(powerAdvice === true ? { powerAdvice: true } : {}) };
  });
}
