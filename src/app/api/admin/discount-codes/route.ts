import type { NextRequest } from "next/server";
import { adminJson, authorizeAdmin } from "@/lib/admin-auth";
import { DiscountCodeError, expiryInstant, normalizeCode, toDiscountCode, validateDiscountInput } from "@/lib/discount-codes";
import { prisma } from "@/lib/prisma";

const listAll = async () => (await prisma.discountCode.findMany({ orderBy: { createdAt: "desc" } })).map(toDiscountCode);

function failure(error: unknown) {
  if (error instanceof DiscountCodeError) return adminJson({ error: error.message }, error.status);
  const code = error && typeof error === "object" && "code" in error ? error.code : "";
  if (code === "P2002") return adminJson({ error: "มีโค้ดนี้อยู่แล้ว" }, 409);
  if (code === "P2025") return adminJson({ error: "ไม่พบโค้ดนี้" }, 404);
  console.error("Discount code request failed:", error);
  return adminJson({ error: "จัดการโค้ดส่วนลดไม่สำเร็จ กรุณาลองอีกครั้ง" }, 503);
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
    return adminJson({ codes: await listAll() });
  } catch (error) { return failure(error); }
}

/** POST creates a code; PUT edits one (the code itself can't change). */
async function save(request: NextRequest, method: "POST" | "PUT") {
  try {
    const denied = await authorizeAdmin(request, true);
    if (denied) return denied;
    const body = await readBody(request);
    if (!body) return adminJson({ error: "ข้อมูลไม่ถูกต้อง" }, 400);
    const { expiresAt, ...data } = validateDiscountInput(body);
    const fields = { ...data, expiresAt: expiresAt ? expiryInstant(expiresAt) : null };
    if (method === "POST") {
      const row = await prisma.discountCode.create({ data: fields });
      return adminJson({ code: toDiscountCode(row) }, 201);
    }
    const { code, ...changes } = fields;
    const existing = await prisma.discountCode.findUnique({ where: { code } });
    if (!existing) return adminJson({ error: "ไม่พบโค้ดนี้" }, 404);
    if (changes.usageLimit !== null && changes.usageLimit < existing.usedCount) throw new DiscountCodeError(`โค้ดนี้ถูกใช้ไปแล้ว ${existing.usedCount} ครั้ง จำนวนที่ใช้ได้ต้องไม่น้อยกว่านี้`);
    const row = await prisma.discountCode.update({ where: { code }, data: changes });
    return adminJson({ code: toDiscountCode(row) });
  } catch (error) { return failure(error); }
}

/** PATCH { code, active } turns a code on or off. */
export async function PATCH(request: NextRequest) {
  try {
    const denied = await authorizeAdmin(request, true);
    if (denied) return denied;
    const body = await readBody(request);
    if (!body || typeof body.active !== "boolean" || !normalizeCode(body.code)) return adminJson({ error: "ข้อมูลไม่ถูกต้อง" }, 400);
    const row = await prisma.discountCode.update({ where: { code: normalizeCode(body.code) }, data: { active: body.active } });
    return adminJson({ code: toDiscountCode(row) });
  } catch (error) { return failure(error); }
}

export async function DELETE(request: NextRequest) {
  try {
    const denied = await authorizeAdmin(request, true);
    if (denied) return denied;
    const body = await readBody(request);
    if (!body || !normalizeCode(body.code)) return adminJson({ error: "ข้อมูลไม่ถูกต้อง" }, 400);
    await prisma.discountCode.delete({ where: { code: normalizeCode(body.code) } });
    return adminJson({ ok: true });
  } catch (error) { return failure(error); }
}

export const POST = (request: NextRequest) => save(request, "POST");
export const PUT = (request: NextRequest) => save(request, "PUT");
