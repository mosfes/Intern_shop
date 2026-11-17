import { type NextRequest, NextResponse } from "next/server";
import { AddressError, validateAddress } from "@/lib/addresses";
import { customerFromRequest } from "@/lib/customer-session";
import { authConfig } from "@/lib/google-auth";
import { prisma } from "@/lib/prisma";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
type Context = { params: Promise<{ id: string }> };

/** Edits an address, or only makes it the default when the body is just { isDefault: true }. */
export async function PUT(request: NextRequest, { params }: Context) {
  try {
    if (request.headers.get("origin") !== authConfig().origin) return json({ error: "คำขอไม่ถูกต้อง" }, 403);
    const user = await customerFromRequest(request);
    if (!user) return json({ error: "กรุณาเข้าสู่ระบบ" }, 401);
    const { id } = await params;
    let body;
    try { body = await request.json(); } catch { return json({ error: "ข้อมูลไม่ถูกต้อง" }, 400); }
    const onlyDefault = body && typeof body === "object" && Object.keys(body).length === 1 && body.isDefault === true;
    let data = {};
    if (!onlyDefault) {
      try { data = validateAddress(body); } catch (error) {
        if (error instanceof AddressError) return json({ error: "ข้อมูลที่อยู่ไม่ถูกต้อง", field: error.message }, 400);
        throw error;
      }
    }
    const found = await prisma.$transaction(async (tx) => {
      const current = await tx.customerAddress.findFirst({ where: { id, userId: user.googleId } });
      if (!current) return false;
      const makeDefault = onlyDefault || body.isDefault === true;
      if (makeDefault) await tx.customerAddress.updateMany({ where: { userId: user.googleId }, data: { isDefault: false } });
      // The default can only move to another address, never be switched off on its own.
      await tx.customerAddress.update({ where: { id }, data: { ...data, ...(makeDefault ? { isDefault: true } : {}) } });
      return true;
    });
    if (!found) return json({ error: "ไม่พบที่อยู่นี้" }, 404);
    return json({ ok: true });
  } catch { return json({ error: "ไม่สามารถบันทึกที่อยู่ได้" }, 503); }
}

/** Deletes an address; if it was the default, the oldest remaining one takes over. */
export async function DELETE(request: NextRequest, { params }: Context) {
  try {
    if (request.headers.get("origin") !== authConfig().origin) return json({ error: "คำขอไม่ถูกต้อง" }, 403);
    const user = await customerFromRequest(request);
    if (!user) return json({ error: "กรุณาเข้าสู่ระบบ" }, 401);
    const { id } = await params;
    const found = await prisma.$transaction(async (tx) => {
      const current = await tx.customerAddress.findFirst({ where: { id, userId: user.googleId } });
      if (!current) return false;
      await tx.customerAddress.delete({ where: { id } });
      if (current.isDefault) {
        const next = await tx.customerAddress.findFirst({ where: { userId: user.googleId }, orderBy: { createdAt: "asc" } });
        if (next) await tx.customerAddress.update({ where: { id: next.id }, data: { isDefault: true } });
      }
      return true;
    });
    if (!found) return json({ error: "ไม่พบที่อยู่นี้" }, 404);
    return json({ ok: true });
  } catch { return json({ error: "ไม่สามารถลบที่อยู่ได้" }, 503); }
}
