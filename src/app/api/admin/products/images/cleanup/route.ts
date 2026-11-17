import { type NextRequest } from "next/server";
import { adminJson, authorizeAdminSession } from "@/lib/admin-auth";
import { cleanupDraftImages, validImageDraftId } from "@/lib/product-image-lifecycle";

export async function POST(request: NextRequest) {
  try {
    const { user, denied } = await authorizeAdminSession(request, true);
    if (denied) return denied;
    if (Number(request.headers.get("content-length")) > 32768) return adminJson({ error: "ข้อมูลไม่ถูกต้อง" }, 413);
    let body;
    try { body = await request.json(); } catch { return adminJson({ error: "ข้อมูลไม่ถูกต้อง" }, 400); }
    if (!body || !validImageDraftId(body.draftId) || (body.urls !== undefined && (!Array.isArray(body.urls) || body.urls.length > 12 || body.urls.some((url: unknown) => typeof url !== "string" || url.length > 2048)))) return adminJson({ error: "ข้อมูลไม่ถูกต้อง" }, 400);
    return adminJson(await cleanupDraftImages(user.googleId, body.draftId, body.urls));
  } catch { return adminJson({ error: "ยังล้างรูปไม่สำเร็จ ระบบจะลองใหม่ภายหลัง" }, 503); }
}
