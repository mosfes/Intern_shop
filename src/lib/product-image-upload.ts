import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { MAX_PRODUCT_IMAGE_BYTES, PRODUCT_IMAGE_TYPES } from "./product-image-policy";
import { prisma } from "./prisma";
import { productImageStorage } from "./r2-storage";

export class ProductImageError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function prepareProductImage(file: File) {
  if (!PRODUCT_IMAGE_TYPES.includes(file.type)) throw new ProductImageError("รองรับเฉพาะรูป JPG, PNG และ WebP");
  if (!file.size) throw new ProductImageError("ไฟล์รูปภาพว่างเปล่า");
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) throw new ProductImageError("รูปภาพแต่ละรูปต้องมีขนาดไม่เกิน 8 MB", 413);
  try {
    const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000, failOn: "warning" });
    const metadata = await image.metadata();
    if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format)) throw new Error("Unsupported image");
    return await image.rotate().resize({ width: 2560, height: 2560, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer({ resolveWithObject: true });
  } catch { throw new ProductImageError("อ่านรูปภาพไม่ได้ กรุณาใช้รูป JPG, PNG หรือ WebP ที่สมบูรณ์และไม่เกิน 40 ล้านพิกเซล"); }
}

export async function uploadProductImage(file: File, ownerId: string, draftId: string) {
  const { data, info } = await prepareProductImage(file);
  const key = `products/uploads/${randomUUID()}.webp`;
  const { client, bucket, base } = productImageStorage();
  try {
    // Reserve before R2 write, so even a lost HTTP response or timed-out upload is recoverable.
    await prisma.imageUpload.create({ data: { key, url: `${base}/${key}`, ownerId, draftId, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: data, ContentType: "image/webp", CacheControl: "public, max-age=31536000, immutable" }), { abortSignal: AbortSignal.timeout(30000) });
  } finally { client.destroy(); }
  return { url: `${base}/${key}`, width: info.width, height: info.height, size: info.size };
}
