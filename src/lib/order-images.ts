import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import sharp from "sharp";

/** Restrict remote images to the configured product bucket; never follow redirects. */
export function productImageUrl(value: string): string | null {
  if (typeof value !== "string" || !value) return null;
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") && !value.split("/").includes("..")) {
    const origin = process.env.EMAIL_SITE_URL || "https://edmpcshop-intern.mosapps.dev";
    try { const url = new URL(value, origin); return url.protocol === "https:" ? url.href : null; } catch { return null; }
  }
  try {
    const url = new URL(value), base = new URL(process.env.NEXT_PUBLIC_IMAGE_BASE_URL || "https://invalid.example");
    if (url.protocol !== "https:" || url.origin !== base.origin || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}

export async function productImageBuffer(value: string): Promise<Buffer | null> {
  try {
    let bytes: Buffer;
    if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) {
      const root = resolve(process.cwd(), "public"), path = resolve(root, `.${value.split("?")[0]}`);
      if (!path.startsWith(root + sep)) return null;
      bytes = await readFile(path);
    } else {
      const url = productImageUrl(value);
      if (!url) return null;
      const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(4000) });
      if (!response.ok || Number(response.headers.get("content-length")) > 5_000_000 || !response.body) return null;
      const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
      for (;;) { const { done, value: chunk } = await reader.read(); if (done) break; size += chunk.length; if (size > 5_000_000) { await reader.cancel(); return null; } chunks.push(chunk); }
      bytes = Buffer.concat(chunks);
    }
    if (bytes.length > 5_000_000) return null;
    return await sharp(bytes, { limitInputPixels: 20_000_000 }).resize(160, 160, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
  } catch { return null; }
}
