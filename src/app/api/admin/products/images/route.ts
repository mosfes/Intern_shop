import { type NextRequest } from "next/server";
import { adminJson, authorizeAdminSession } from "@/lib/admin-auth";
import { MAX_PRODUCT_IMAGE_BYTES } from "@/lib/product-image-policy";
import { ProductImageError, uploadProductImage } from "@/lib/product-image-upload";
import { afterImageCleanup, cleanupExpiredImageUploads, validImageDraftId } from "@/lib/product-image-lifecycle";

async function readImage(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("multipart/form-data;") || !request.body) throw new ProductImageError("กรุณาเลือกไฟล์รูปภาพ");
  const maxRequestBytes = MAX_PRODUCT_IMAGE_BYTES + 64 * 1024;
  if (Number(request.headers.get("content-length")) > maxRequestBytes) throw new ProductImageError("รูปภาพแต่ละรูปต้องมีขนาดไม่เกิน 8 MB", 413);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maxRequestBytes) { await reader.cancel(); throw new ProductImageError("รูปภาพแต่ละรูปต้องมีขนาดไม่เกิน 8 MB", 413); }
      chunks.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  let form;
  try {
    form = await new Response(new Uint8Array(Buffer.concat(chunks)), { headers: { "content-type": contentType } }).formData();
  } catch { throw new ProductImageError("ข้อมูลไฟล์รูปภาพไม่ถูกต้อง"); }
  const file = form.get("file");
  const draftId = form.get("draftId");
  if (!(file instanceof File) || [...form.entries()].length !== 2 || !validImageDraftId(draftId)) throw new ProductImageError("กรุณาอัปโหลดรูปภาพครั้งละ 1 ไฟล์จากฟอร์มสินค้า");
  return { file, draftId };
}

export async function POST(request: NextRequest) {
  try {
    const { user, denied } = await authorizeAdminSession(request, true);
    if (denied) return denied;
    const { file, draftId } = await readImage(request);
    const image = await uploadProductImage(file, user.googleId, draftId);
    afterImageCleanup(() => cleanupExpiredImageUploads());
    return adminJson({ image }, 201);
  } catch (error) {
    if (error instanceof ProductImageError) return adminJson({ error: error.message }, error.status);
    return adminJson({ error: "อัปโหลดรูปไม่สำเร็จ กรุณาลองอีกครั้ง" }, 503);
  }
}
