import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { authConfig } from "@/lib/google-auth";
import { prisma } from "@/lib/prisma";
import { codeHash } from "@/lib/registration-code";
import { REGISTRATION_CLOSED_MESSAGE, REGISTRATION_OPEN } from "@/lib/registration";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: NextRequest) {
  if (!REGISTRATION_OPEN) return json({ error: REGISTRATION_CLOSED_MESSAGE }, 403);
  try {
    if (request.headers.get("origin") !== authConfig().origin) return json({ error: "คำขอไม่ถูกต้อง" }, 403);
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (email.length > 191 || typeof body.code !== "string" || !/^\d{6}$/.test(body.code)) return json({ error: "กรุณากรอกรหัส 6 หลัก" }, 400);
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const claim = await tx.pendingRegistration.updateMany({ where: { email, expiresAt: { gt: now }, attempts: { lt: 5 } }, data: { attempts: { increment: 1 } } });
      if (!claim.count) return false;
      const pending = await tx.pendingRegistration.findUniqueOrThrow({ where: { email } });
      if (pending.codeHash !== codeHash(email, body.code)) return false;
      if (await tx.shopUser.findUnique({ where: { email } }) || await tx.adminCredential.findUnique({ where: { email } })) return false;
      await tx.shopUser.create({ data: { googleId: `local:${randomUUID()}`, email, name: pending.name, phone: pending.phone } });
      await tx.customerCredential.create({ data: { email, passwordHash: pending.passwordHash } });
      await tx.pendingRegistration.delete({ where: { email } });
      return true;
    });
    return result ? json({ ok: true }) : json({ error: "รหัสไม่ถูกต้อง หมดอายุ หรือใช้เกินจำนวนครั้ง กรุณาขอรหัสใหม่" }, 400);
  } catch { return json({ error: "ยืนยันไม่สำเร็จ กรุณาลองใหม่" }, 503); }
}
