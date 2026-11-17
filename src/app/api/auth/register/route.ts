import { randomInt } from "node:crypto";
import { codeHash } from "@/lib/registration-code";
import { NextRequest, NextResponse } from "next/server";
import { authConfig } from "@/lib/google-auth";
import { hashPassword, validPassword } from "@/lib/admin-password";
import { prisma } from "@/lib/prisma";
import { REGISTRATION_CLOSED_MESSAGE, REGISTRATION_OPEN } from "@/lib/registration";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: NextRequest) {
  if (!REGISTRATION_OPEN) return json({ error: REGISTRATION_CLOSED_MESSAGE }, 403);
  try {
    if (request.headers.get("origin") !== authConfig().origin) return json({ error: "คำขอไม่ถูกต้อง" }, 403);
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 191 || !name || name.length > 255 || phone.length > 30 || !validPassword(body.password)) return json({ error: "กรุณาตรวจสอบข้อมูลและใช้รหัสผ่าน 12–128 ตัวอักษร" }, 400);
    if (await prisma.shopUser.findUnique({ where: { email } }) || await prisma.adminCredential.findUnique({ where: { email } })) return json({ error: "อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ" }, 409);
    const old = await prisma.pendingRegistration.findUnique({ where: { email } });
    if (old && old.expiresAt.getTime() > Date.now() + 9 * 60_000) return json({ error: "กรุณารอสักครู่ก่อนขอรหัสใหม่" }, 429);
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) return json({ error: "ระบบส่งอีเมลยังไม่พร้อมใช้งาน" }, 503);
    const code = String(randomInt(0, 1000000)).padStart(6, "0");
    const data = { name, phone, passwordHash: await hashPassword(body.password), codeHash: codeHash(email, code), attempts: 0, expiresAt: new Date(Date.now() + 10 * 60_000) };
    await prisma.pendingRegistration.upsert({ where: { email }, create: { email, ...data }, update: data });
    const sent = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.RESEND_FROM, to: [email], subject: "รหัสยืนยันการสมัครสมาชิก EDM PC Shop", html: `<p>รหัสยืนยันการสมัครสมาชิกของคุณคือ <strong>${code}</strong></p><p>รหัสมีอายุ 10 นาที หากคุณไม่ได้สมัครสมาชิก กรุณาเพิกเฉยต่ออีเมลนี้</p>` }), signal: AbortSignal.timeout(10000) });
    if (!sent.ok) {
      await prisma.pendingRegistration.deleteMany({ where: { email, codeHash: data.codeHash } });
      console.error("Registration email delivery failed", { status: sent.status });
      return json({ error: "ส่งอีเมลยืนยันไม่สำเร็จ กรุณาติดต่อผู้ดูแลร้าน" }, 503);
    }
    return json({ ok: true });
  } catch (error) {
    console.error("Registration failed", { message: error instanceof Error ? error.message : "unknown" });
    return json({ error: "ไม่สามารถส่งรหัสยืนยันได้ กรุณาลองใหม่ภายหลัง" }, 503);
  }
}
