import type { Category, Product, ProductTag, Specification } from "./types";

export const PRODUCT_TAGS: { value: ProductTag; label: string }[] = [
  { value: "best-seller", label: "ขายดี" },
  { value: "new", label: "สินค้าใหม่" },
  { value: "recommended", label: "แนะนำ" },
  { value: "flash-sale", label: "Flash Sale" },
  { value: "special-offer", label: "ราคาพิเศษ" },
];

export type ProductInput = Omit<Product, "id" | "rating" | "reviewCount" | "reviews">;

export class ProductInputError extends Error {}
export const MAX_PRODUCT_STOCK = 1_000_000;

export function validateProductInput(value: unknown, categories: Category[]): ProductInput {
  const fail = (message: string): never => { throw new ProductInputError(message); };
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail("ข้อมูลสินค้าไม่ถูกต้อง");
  const data = value as Record<string, unknown>;
  function string(key: string, max: number, required = false) {
    const value = data[key];
    if (typeof value !== "string" || value.trim().length > max || (required && !value.trim())) return fail(`กรุณาตรวจสอบข้อมูล ${key}`);
    return value.trim();
  }
  function number(key: string, max: number, integer = false) {
    const value = data[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max || (integer && !Number.isInteger(value))) return fail(`กรุณาตรวจสอบข้อมูล ${key}`);
    return value;
  }
  function lines(key: string, maxCount: number, maxLength: number): string[] {
    const value = data[key];
    if (!Array.isArray(value) || value.length > maxCount || value.some((line) => typeof line !== "string" || !line.trim() || line.length > maxLength)) return fail(`กรุณาตรวจสอบข้อมูล ${key}`);
    return value.map((line: string) => line.trim());
  }
  const slug = string("slug", 180, true);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return fail("ลิงก์สินค้าต้องเป็นอักษรอังกฤษตัวเล็ก ตัวเลข และขีดกลาง");
  const category = string("category", 180, true);
  if (!categories.some((entry) => entry.slug === category)) return fail("กรุณาเลือกหมวดหมู่ที่มีอยู่ในระบบ");
  const price = number("price", 100_000_000);
  const originalPrice = number("originalPrice", 100_000_000);
  if (originalPrice < price) return fail("ราคาปกติต้องไม่น้อยกว่าราคาขาย");
  if ([price, originalPrice].some((amount) => Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001)) return fail("ราคามีทศนิยมได้ไม่เกิน 2 ตำแหน่ง");
  const images = lines("images", 12, 2048);
  if (!images.length) return fail("กรุณาเพิ่มรูปภาพสินค้าอย่างน้อย 1 รูป");
  const imageBase = process.env.NEXT_PUBLIC_IMAGE_BASE_URL?.replace(/\/$/, "");
  if (images.some((url) => !(/^\/(?!\/)[^\s\\]+$/.test(url) || (imageBase && url.startsWith(`${imageBase}/`) && !/[\s\\]/.test(url))))) return fail("รูปภาพต้องเป็นพาธในเว็บไซต์ หรือ URL จากคลังรูปภาพของร้าน");
  const tags = lines("tags", PRODUCT_TAGS.length, 30);
  if (new Set(tags).size !== tags.length || tags.some((tag) => !PRODUCT_TAGS.some((option) => option.value === tag))) return fail("ป้ายกำกับสินค้าไม่ถูกต้อง");
  const specifications = data.specifications;
  if (!Array.isArray(specifications) || specifications.length > 80 || specifications.some((spec) => !spec || typeof spec !== "object" || typeof spec.label !== "string" || !spec.label.trim() || spec.label.length > 120 || typeof spec.value !== "string" || !spec.value.trim() || spec.value.length > 1000)) return fail("กรุณากรอกชื่อและค่าของสเปกให้ครบทุกแถว");
  return {
    name: string("name", 255, true), brand: string("brand", 100, true), slug, category,
    price, originalPrice, discount: originalPrice > 0 ? Math.round((1 - price / originalPrice) * 100) : 0,
    stock: number("stock", MAX_PRODUCT_STOCK, true), images, tags: tags as ProductTag[],
    description: string("description", 20000), warranty: string("warranty", 255),
    highlights: lines("highlights", 30, 1000), shortSpecs: lines("shortSpecs", 20, 1000),
    specifications: (specifications as Specification[]).map(({ label, value }) => ({ label: label.trim(), value: value.trim() })),
  };
}
