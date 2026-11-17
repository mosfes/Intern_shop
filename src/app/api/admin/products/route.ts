import { withAdminActivity } from "@/lib/admin-activity";
import { type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { adminJson, authorizeAdmin, authorizeAdminSession } from "@/lib/admin-auth";
import { CatalogApiError, createTiDBProduct, deleteStoredProduct, getAdminProducts, getStoredProduct, StockConflictError, updateStoredProduct, updateStoredProductStock } from "@/lib/admin-products";
import { MAX_PRODUCT_STOCK, ProductInputError, validateProductInput } from "@/lib/product-management";
import { CATALOG_TAG } from "@/lib/catalog-server";
import { afterImageCleanup, cleanupDraftImages, cleanupExpiredImageUploads, cleanupRemovedProductImages, validImageDraftId, withProductImageUploads } from "@/lib/product-image-lifecycle";
import { ProductImageError } from "@/lib/product-image-upload";
import { PaymentError } from "@/lib/payments";

function failure(error: unknown) {
  if (error instanceof PaymentError) return adminJson({ error: error.message }, error.status);
  if (error instanceof StockConflictError) return adminJson({ error: `สต็อกมีการเปลี่ยนแปลง ล่าสุดเหลือ ${error.stock} ชิ้น กรุณาตรวจสอบแล้วบันทึกอีกครั้ง`, stock: error.stock }, 409);
  if (error instanceof ProductInputError) return adminJson({ error: error.message }, 400);
  if (error instanceof ProductImageError) return adminJson({ error: error.message }, error.status);
  if (error && typeof error === "object" && "code" in error) {
    if (error.code === "P2002") return adminJson({ error: "ลิงก์สินค้านี้ถูกใช้งานแล้ว กรุณาเปลี่ยนลิงก์" }, 409);
    if (error.code === "P2025") return adminJson({ error: "ไม่พบสินค้า กรุณาโหลดรายการใหม่" }, 404);
  }
  if (error instanceof CatalogApiError && error.status === 404) return adminJson({ error: "ไม่พบสินค้า กรุณาโหลดรายการใหม่" }, 404);
  return adminJson({ error: "เชื่อมต่อข้อมูลสินค้าไม่สำเร็จ กรุณาลองอีกครั้ง" }, 503);
}

export async function GET(request: NextRequest) {
  try {
    const denied = await authorizeAdmin(request);
    if (denied) return denied;
    afterImageCleanup(() => cleanupExpiredImageUploads());
    return adminJson(await getAdminProducts());
  } catch (error) { return failure(error); }
}

async function mutate(request: NextRequest, method: "POST" | "PUT" | "DELETE") {
  try {
    const { user, denied } = await authorizeAdminSession(request, true);
    if (denied) return denied;
    let body;
    try { body = await request.json(); } catch { return adminJson({ error: "ข้อมูลไม่ถูกต้อง" }, 400); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return adminJson({ error: "ข้อมูลไม่ถูกต้อง" }, 400);
    if (method !== "POST" && (typeof body.id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(body.id))) return adminJson({ error: "รหัสสินค้าไม่ถูกต้อง" }, 400);
    if (method === "DELETE") {
      const existing = await getStoredProduct(body.id);
      await deleteStoredProduct(body.id);
      revalidateTag(CATALOG_TAG, { expire: 0 });
      afterImageCleanup(() => cleanupRemovedProductImages(existing.images));
      return adminJson({ ok: true });
    }
    const { products, categories } = await getAdminProducts();
    const input = validateProductInput(body, categories);
    if (method === "PUT" && !Number.isSafeInteger(body.expectedStock)) return adminJson({ error: "ข้อมูลสต็อกเดิมไม่ถูกต้อง กรุณาโหลดรายการใหม่" }, 400);
    const existing = method === "PUT" ? await getStoredProduct(body.id) : null;
    if (products.some((product) => product.slug === input.slug && (method === "POST" || product.id !== body.id))) return adminJson({ error: "ลิงก์สินค้านี้ถูกใช้งานแล้ว กรุณาเปลี่ยนลิงก์" }, 409);
    // Read-only fields (ratings and reviews) come from the stored product, never the submitted form.
    const category = categories.find((category) => category.slug === input.category)!;
    const product = await withProductImageUploads(input.images, user.googleId, body.draftId, (tx) => existing ? updateStoredProduct(existing, input, category, tx, body.expectedStock) : createTiDBProduct(input, category, tx));
    revalidateTag(CATALOG_TAG, { expire: 0 });
    const removed = existing?.images.filter((url) => !product.images.includes(url)) ?? [];
    afterImageCleanup(async () => {
      await cleanupRemovedProductImages(removed);
      if (validImageDraftId(body.draftId)) await cleanupDraftImages(user.googleId, body.draftId);
    });
    return adminJson({ product }, method === "POST" ? 201 : 200);
  } catch (error) { return failure(error); }
}

const handlePOST = (request: NextRequest) => mutate(request, "POST");
const handlePUT = (request: NextRequest) => mutate(request, "PUT");
const handleDELETE = (request: NextRequest) => mutate(request, "DELETE");

export const PATCH = withAdminActivity("products", async (request: NextRequest) => {
  try {
    const { denied } = await authorizeAdminSession(request, true);
    if (denied) return denied;
    let body;
    try { body = await request.json(); } catch { return adminJson({ error: "ข้อมูลไม่ถูกต้อง" }, 400); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return adminJson({ error: "ข้อมูลไม่ถูกต้อง" }, 400);
    if (typeof body.id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(body.id)) return adminJson({ error: "รหัสสินค้าไม่ถูกต้อง" }, 400);
    if (!Number.isInteger(body.stock) || body.stock < 0 || body.stock > MAX_PRODUCT_STOCK) return adminJson({ error: "กรุณาระบุสต็อกเป็นจำนวนเต็มตั้งแต่ 0 ถึง 1,000,000 ชิ้น" }, 400);
    // Paid orders may leave a negative count, which admins must still be able to correct.
    if (!Number.isSafeInteger(body.expectedStock)) return adminJson({ error: "ข้อมูลสต็อกเดิมไม่ถูกต้อง กรุณาโหลดรายการใหม่" }, 400);
    const product = await updateStoredProductStock(body.id, body.stock, body.expectedStock);
    revalidateTag(CATALOG_TAG, { expire: 0 });
    return adminJson({ product });
  } catch (error) { return failure(error); }
});

export const POST = withAdminActivity("products", handlePOST);

export const PUT = withAdminActivity("products", handlePUT);

export const DELETE = withAdminActivity("products", handleDELETE);
