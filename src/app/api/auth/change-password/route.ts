import { type NextRequest, NextResponse } from "next/server";
import { authConfig, cookieOptions, readAuthToken, SESSION_COOKIE, signAuthToken } from "@/lib/google-auth";
import { hashPassword, validPassword, verifyPassword } from "@/lib/admin-password";
import { sessionUser } from "@/lib/shop-users";
import { prisma } from "@/lib/prisma";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== authConfig().origin) return json({ error: "คำขอไม่ถูกต้อง" }, 403);
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const user = await sessionUser(token);
    if (!user || !token) return json({ error: "กรุณาเข้าสู่ระบบใหม่" }, 401);
    const claims = await readAuthToken(token, "session");
    if (claims.authMethod !== "password" || !user.mustChangePassword) return json({ error: "บัญชีนี้ไม่อยู่ระหว่างการเปลี่ยนรหัสผ่านครั้งแรก" }, 403);
    let body;
    try { body = await request.json(); } catch { return json({ error: "ข้อมูลไม่ถูกต้อง" }, 400); }
    if (!body || !validPassword(body.password)) return json({ error: "รหัสผ่านต้องมีความยาว 12–128 ตัวอักษร" }, 400);
    if (body.password !== body.confirm) return json({ error: "รหัสผ่านไม่ตรงกัน" }, 400);
    const credential = await prisma.adminCredential.findUnique({ where: { email: user.email } });
    if (!credential?.active || !credential.passwordHash || credential.version !== claims.credentialVersion) return json({ error: "กรุณาเข้าสู่ระบบใหม่" }, 401);
    if (await verifyPassword(body.password, credential.passwordHash)) return json({ error: "กรุณาตั้งรหัสผ่านใหม่ที่ต่างจากรหัสผ่านชั่วคราว" }, 400);
    const passwordHash = await hashPassword(body.password);
    // Only one request can consume this credential version, including a concurrent admin reset.
    const changed = await prisma.adminCredential.updateMany({
      where: { email: user.email, active: true, version: credential.version, mustChangePassword: true },
      data: { passwordHash, mustChangePassword: false, version: { increment: 1 } },
    });
    if (!changed.count) return json({ error: "ข้อมูลบัญชีเปลี่ยนแปลง กรุณาเข้าสู่ระบบใหม่" }, 409);
    const remaining = Math.max(1, (claims.exp ?? 0) - Math.floor(Date.now() / 1000));
    const nextToken = await signAuthToken({ sub: user.googleId, email: user.email, name: user.name, authMethod: "password", remember: claims.remember !== false, credentialVersion: credential.version + 1 }, "session", remaining);
    const response = json({ ok: true });
    response.cookies.set(SESSION_COOKIE, nextToken, { ...cookieOptions, ...(claims.remember === false ? {} : { maxAge: remaining }) });
    return response;
  } catch { return json({ error: "เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองอีกครั้ง" }, 503); }
}
