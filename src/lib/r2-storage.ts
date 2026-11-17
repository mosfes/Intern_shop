import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

export function productImageStorage() {
  const account = process.env.R2_ACCOUNT_ID;
  const bucket = process.env.R2_BUCKET;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const base = process.env.NEXT_PUBLIC_IMAGE_BASE_URL?.replace(/\/+$/, "");
  if (!account || !bucket || !accessKeyId || !secretAccessKey || !base) throw new Error("Image storage is not configured");
  const client = new S3Client({ region: "auto", endpoint: `https://${account}.r2.cloudflarestorage.com`, credentials: { accessKeyId, secretAccessKey } });
  return { client, bucket, base };
}

export const MANAGED_IMAGE_KEY = /^products\/uploads\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.webp$/;

export function managedImageKey(url: string) {
  const base = process.env.NEXT_PUBLIC_IMAGE_BASE_URL?.replace(/\/+$/, "");
  if (!base || !url.startsWith(`${base}/`)) return null;
  const key = url.slice(base.length + 1).split(/[?#]/, 1)[0];
  return MANAGED_IMAGE_KEY.test(key) ? key : null;
}

export async function deleteProductImageObject(key: string) {
  if (!MANAGED_IMAGE_KEY.test(key)) throw new Error("Not a managed upload");
  const { client, bucket } = productImageStorage();
  try { await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }), { abortSignal: AbortSignal.timeout(30000) }); }
  finally { client.destroy(); }
}
