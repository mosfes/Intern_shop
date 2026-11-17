import { withAdminActivity } from "@/lib/admin-activity";
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { adminJson as json, authorizeAdmin as authorize } from "@/lib/admin-auth";
import { hashPassword, validPassword, validUsername } from "@/lib/admin-password";
import { prisma } from "@/lib/prisma";
import { normalizeEmail, validEmail } from "@/lib/admin-policy";

export async function GET(request: NextRequest) {
  try {
    const denied = await authorize(request);
    if (denied) return denied;
    const [users, credentials] = await Promise.all([
      prisma.shopUser.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.adminCredential.findMany({ where: { active: true }, select: { email: true, username: true }, orderBy: { updatedAt: "asc" } }),
    ]);
    const admins = credentials.map((entry) => entry.email);
    return json({ admins, credentials: credentials.map(({ email, username }) => ({ email, username })), users: users.map((user) => ({ ...user, role: admins.includes(user.email) ? "admin" : "customer" })) });
  } catch { return json({ error: "โหลดข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง" }, 503); }
}

async function handlePATCH(request: NextRequest) {
  try {
    const denied = await authorize(request, true);
    if (denied) return denied;
    let body;
    try { body = await request.json(); } catch { return json({ error: "ข้อมูลไม่ถูกต้อง" }, 400); }
    if (!body || typeof body !== "object") return json({ error: "ข้อมูลไม่ถูกต้อง" }, 400);
    if (body.action === "addAdmin" || body.action === "removeAdmin" || body.action === "setCredentials") {
      if (!validEmail(body.email)) return json({ error: "กรุณากรอกอีเมลให้ถูกต้อง" }, 400);
      const email = normalizeEmail(body.email);
      if (body.action === "removeAdmin") {
        await prisma.adminCredential.updateMany({ where: { email }, data: { active: false, username: null, passwordHash: null, version: { increment: 1 } } });
      } else {
        const user = await prisma.shopUser.findUnique({ where: { email } });
        if (user?.disabled) return json({ error: "กรุณาเปิดใช้งานบัญชีก่อนเพิ่มเป็นแอดมิน" }, 400);
        if (body.action === "setCredentials" && !(await prisma.adminCredential.findUnique({ where: { email }, select: { active: true } }))?.active) return json({ error: "ตั้งรหัสผ่านได้เฉพาะบัญชีแอดมิน" }, 400);
        const hasProfile = body.action === "addAdmin" && (body.name !== undefined || body.phone !== undefined);
        if (hasProfile && (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 255 || typeof body.phone !== "string" || body.phone.length > 30)) return json({ error: "กรุณากรอกชื่อ นามสกุล และเบอร์โทรศัพท์ให้ถูกต้อง" }, 400);
        if (hasProfile && body.disabled !== undefined && typeof body.disabled !== "boolean") return json({ error: "สถานะบัญชีไม่ถูกต้อง" }, 400);
        let login: { username: string; passwordHash: string; mustChangePassword: boolean } | undefined;
        if (body.action === "setCredentials" || body.username !== undefined || body.password !== undefined) {
          if (!validUsername(body.username) || !validPassword(body.password)) return json({ error: "ชื่อผู้ใช้ต้องเป็นอักษรอังกฤษ ตัวเลข จุด ขีดกลาง หรือขีดล่าง 3–64 ตัว และรหัสผ่าน 12–128 ตัว" }, 400);
          login = { username: body.username.toLowerCase(), passwordHash: await hashPassword(body.password), mustChangePassword: true };
        }
        const saveCredential = (db: Pick<typeof prisma, "adminCredential">) => db.adminCredential.upsert({
          where: { email },
          create: { email, ...login, active: true },
          update: { ...login, active: true, version: { increment: 1 } },
        });
        if (hasProfile) {
          await prisma.$transaction(async (tx) => {
            await tx.shopUser.upsert({
              where: { email },
              create: { googleId: `local:${randomUUID()}`, email, name: body.name.trim(), phone: body.phone.trim(), disabled: body.disabled ?? false },
              update: { name: body.name.trim(), phone: body.phone.trim(), ...(body.disabled !== undefined ? { disabled: body.disabled } : {}) },
            });
            await saveCredential(tx);
          });
        } else await saveCredential(prisma);
      }
    } else if (body.action === "updateUser") {
      if (!validEmail(body.email) || (body.role !== "admin" && body.role !== "customer") || typeof body.disabled !== "boolean") return json({ error: "ข้อมูลผู้ใช้ไม่ถูกต้อง" }, 400);
      const email = normalizeEmail(body.email);
      const user = await prisma.shopUser.findUnique({ where: { email } });
      const credential = await prisma.adminCredential.findUnique({ where: { email } });
      if (!user && !credential?.active) return json({ error: "ไม่พบบัญชีผู้ใช้" }, 404);
      if (user && (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 255 || typeof body.phone !== "string" || body.phone.length > 30)) return json({ error: "ข้อมูลผู้ใช้ไม่ถูกต้อง" }, 400);
      if (body.role === "admin" && !credential?.active && body.disabled) return json({ error: "กรุณาเปิดใช้งานบัญชีก่อนเพิ่มเป็นแอดมิน" }, 400);
      await prisma.$transaction(async (tx) => {
        if (user) await tx.shopUser.update({ where: { googleId: user.googleId }, data: { name: body.name.trim(), phone: body.phone.trim(), disabled: body.disabled } });
        if (body.role === "admin" && !credential?.active) await tx.adminCredential.upsert({ where: { email }, create: { email, active: true }, update: { active: true, version: { increment: 1 } } });
        if (body.role === "customer" && credential?.active) await tx.adminCredential.updateMany({ where: { email }, data: { active: false, username: null, passwordHash: null, version: { increment: 1 } } });
      });
    } else if (body.action === "updateCustomer") {
      if (typeof body.googleId !== "string" || typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 255 || typeof body.phone !== "string" || body.phone.length > 30 || typeof body.disabled !== "boolean") return json({ error: "ข้อมูลลูกค้าไม่ถูกต้อง" }, 400);
      const user = await prisma.shopUser.findUnique({ where: { googleId: body.googleId } });
      if (!user) return json({ error: "ไม่พบบัญชีลูกค้า" }, 404);
      if ((await prisma.adminCredential.findUnique({ where: { email: user.email }, select: { active: true } }))?.active) return json({ error: "จัดการข้อมูลได้เฉพาะบัญชีลูกค้า" }, 400);
      await prisma.shopUser.update({ where: { googleId: user.googleId }, data: { name: body.name.trim(), phone: body.phone.trim(), disabled: body.disabled } });
    } else return json({ error: "คำสั่งไม่ถูกต้อง" }, 400);
    return json({ ok: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return json({ error: "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว" }, 409);
    return json({ error: "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง" }, 503);
  }
}

export const PATCH = withAdminActivity("users", handlePATCH);
