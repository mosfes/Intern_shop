import { createHash, randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authConfig, cookieOptions, SESSION_AGE, SESSION_COOKIE, signAuthToken } from "@/lib/google-auth";
import { validUsername, verifyPassword } from "@/lib/admin-password";
import { recordAdminAuth } from "@/lib/admin-activity";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const invalid = () => json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือบัญชีไม่มีสิทธิ์แอดมิน" }, 401);

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== authConfig().origin) return json({ error: "คำขอไม่ถูกต้อง" }, 403);
    let body;
    try { body = await request.json(); } catch { return json({ error: "ข้อมูลไม่ถูกต้อง" }, 400); }
    if (!body || !validUsername(body.username) || typeof body.password !== "string" || !body.password.length || body.password.length > 128) return invalid();
    const username = body.username.toLowerCase();
    const now = Date.now();
    const windowEnd = (Math.floor(now / 900000) + 1) * 900000;
    const key = createHash("sha256").update(`${username}:${windowEnd}`).digest("hex");
    await prisma.adminLoginLimit.deleteMany({ where: { expiresAt: { lt: new Date(now) } } });
    const limit = await prisma.adminLoginLimit.upsert({ where: { key }, create: { key, attempts: 1, expiresAt: new Date(windowEnd) }, update: { attempts: { increment: 1 } } });
    if (limit.attempts > 10) {
      const response = json({ error: "ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณาลองอีกครั้งใน 15 นาที" }, 429);
      response.headers.set("Retry-After", String(Math.ceil((windowEnd - now) / 1000)));
      return response;
    }
    const credential = await prisma.adminCredential.findUnique({ where: { username } });
    const correct = await verifyPassword(body.password, credential?.passwordHash ?? undefined);
    if (!credential?.active || !correct) return invalid();
    // Session reads recheck membership and credential version after sign-in.
    const existing = await prisma.shopUser.findUnique({ where: { email: credential.email } });
    if (existing?.disabled) return invalid();
    const user = await prisma.shopUser.upsert({
      where: { email: credential.email },
      create: { googleId: `local:${randomUUID()}`, email: credential.email, name: username },
      update: { lastLogin: new Date() },
    });
    const token = await signAuthToken({ sub: user.googleId, email: user.email, name: user.name, authMethod: "password", remember: body.remember !== false, credentialVersion: credential.version }, "session", body.remember === false ? 60 * 60 * 8 : SESSION_AGE);
    await prisma.adminLoginLimit.deleteMany({ where: { key } });
    await recordAdminAuth(user, "LOGIN_PASSWORD", request);
    const response = json({ ok: true, mustChangePassword: credential.mustChangePassword });
    response.cookies.set(SESSION_COOKIE, token, { ...cookieOptions, ...(body.remember === false ? {} : { maxAge: SESSION_AGE }) });
    return response;
  } catch { return json({ error: "เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง" }, 503); }
}
