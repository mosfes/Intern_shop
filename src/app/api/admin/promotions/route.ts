import { withAdminActivity } from "@/lib/admin-activity";
import type { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { adminJson, authorizeAdmin, authorizeAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { PROMOTION_PLACEMENTS, PromotionError, validatePromotion, type PromotionPlacement } from "@/lib/promotions";
import { PROMOTIONS_TAG, toPromotion } from "@/lib/promotions-server";
import { afterImageCleanup, cleanupDraftImages, cleanupRemovedProductImages, validImageDraftId, withProductImageUploads } from "@/lib/product-image-lifecycle";
import { ProductImageError } from "@/lib/product-image-upload";

const listAll = async () => (await prisma.promotion.findMany({ orderBy: [{ placement: "asc" }, { position: "asc" }] })).map(toPromotion);

function failure(error: unknown) {
  if (error instanceof PromotionError || error instanceof ProductImageError) return adminJson({ error: error.message }, error.status);
  if (error && typeof error === "object" && "code" in error && error.code === "P2025") return adminJson({ error: "ไม่พบโปรโมชันนี้" }, 404);
  return adminJson({ error: "จัดการโปรโมชันไม่สำเร็จ กรุณาลองอีกครั้ง" }, 503);
}

async function readBody(request: NextRequest) {
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : null;
  } catch { return null; }
}

export async function GET(request: NextRequest) {
  try {
    const denied = await authorizeAdmin(request);
    if (denied) return denied;
    return adminJson({ promotions: await listAll() });
  } catch (error) { return failure(error); }
}

/** POST creates, PUT updates one promotion. */
async function save(request: NextRequest, method: "POST" | "PUT") {
  try {
    const { user, denied } = await authorizeAdminSession(request, true);
    if (denied) return denied;
    const body = await readBody(request);
    if (!body) return adminJson({ error: "ข้อมูลไม่ถูกต้อง" }, 400);
    const existing = method === "PUT" && typeof body.id === "string" ? await prisma.promotion.findUnique({ where: { id: body.id } }) : null;
    if (method === "PUT" && !existing) return adminJson({ error: "ไม่พบโปรโมชันนี้" }, 404);
    // The placement is fixed by the section the item was added to; edits cannot move it.
    const data = validatePromotion(existing ? { ...body, placement: existing.placement } : body);
    if (!existing) {
      const limit = PROMOTION_PLACEMENTS.find((entry) => entry.id === data.placement)!.limit;
      if (await prisma.promotion.count({ where: { placement: data.placement } }) >= limit) return adminJson({ error: `ตำแหน่งนี้มีได้สูงสุด ${limit} รายการ` }, 409);
    }
    const row = await withProductImageUploads([data.image], user.googleId, body.draftId, async (tx) => {
      const db = tx ?? prisma;
      if (existing) return db.promotion.update({ where: { id: existing.id }, data });
      const last = await db.promotion.findFirst({ where: { placement: data.placement }, orderBy: { position: "desc" }, select: { position: true } });
      return db.promotion.create({ data: { ...data, position: (last?.position ?? -1) + 1 } });
    });
    revalidateTag(PROMOTIONS_TAG, { expire: 0 });
    afterImageCleanup(async () => {
      if (existing && existing.image !== data.image) await cleanupRemovedProductImages([existing.image]);
      if (validImageDraftId(body.draftId)) await cleanupDraftImages(user.googleId, body.draftId);
    });
    return adminJson({ promotion: toPromotion(row) }, existing ? 200 : 201);
  } catch (error) { return failure(error); }
}

/** PATCH: { action: "toggle", id, active } or { action: "reorder", placement, ids }. */
async function handlePATCH(request: NextRequest) {
  try {
    const { denied } = await authorizeAdminSession(request, true);
    if (denied) return denied;
    const body = await readBody(request);
    if (body?.action === "toggle" && typeof body.id === "string" && typeof body.active === "boolean") {
      await prisma.promotion.update({ where: { id: body.id }, data: { active: body.active } });
    } else if (body?.action === "reorder" && PROMOTION_PLACEMENTS.some((entry) => entry.id === body.placement) && Array.isArray(body.ids) && body.ids.every((id) => typeof id === "string")) {
      const ids = body.ids as string[];
      const rows = await prisma.promotion.findMany({ where: { placement: body.placement as PromotionPlacement }, select: { id: true } });
      if (rows.length !== ids.length || !rows.every((row) => ids.includes(row.id))) return adminJson({ error: "รายการเปลี่ยนไปแล้ว กรุณาโหลดหน้าใหม่" }, 409);
      await prisma.$transaction(ids.map((id, position) => prisma.promotion.update({ where: { id }, data: { position } })));
    } else return adminJson({ error: "ข้อมูลไม่ถูกต้อง" }, 400);
    revalidateTag(PROMOTIONS_TAG, { expire: 0 });
    return adminJson({ promotions: await listAll() });
  } catch (error) { return failure(error); }
}

async function handleDELETE(request: NextRequest) {
  try {
    const { denied } = await authorizeAdminSession(request, true);
    if (denied) return denied;
    const body = await readBody(request);
    if (typeof body?.id !== "string") return adminJson({ error: "ข้อมูลไม่ถูกต้อง" }, 400);
    const row = await prisma.promotion.delete({ where: { id: body.id } });
    revalidateTag(PROMOTIONS_TAG, { expire: 0 });
    afterImageCleanup(() => cleanupRemovedProductImages([row.image]));
    return adminJson({ ok: true });
  } catch (error) { return failure(error); }
}

const handlePOST = (request: NextRequest) => save(request, "POST");
const handlePUT = (request: NextRequest) => save(request, "PUT");

export const PATCH = withAdminActivity("promotions", handlePATCH);

export const DELETE = withAdminActivity("promotions", handleDELETE);

export const POST = withAdminActivity("promotions", handlePOST);

export const PUT = withAdminActivity("promotions", handlePUT);
