import type { NextRequest } from "next/server";
import { adminJson, authorizeAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const denied = await authorizeAdmin(request);
    if (denied) return denied;
    const page = Math.max(1, Math.min(10000, Number(request.nextUrl.searchParams.get("page")) || 1));
    if (!Number.isInteger(page)) return adminJson({ error: "เลขหน้าไม่ถูกต้อง" }, 400);
    const resource = request.nextUrl.searchParams.get("resource") || undefined;
    const where = resource ? { resource } : {};
    const [logs, total] = await Promise.all([
      prisma.adminActivityLog.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 25, take: 25 }),
      prisma.adminActivityLog.count({ where }),
    ]);
    return adminJson({ logs, total, page });
  } catch { return adminJson({ error: "โหลดประวัติไม่สำเร็จ กรุณาตรวจสอบการตั้งค่าตาราง Log" }, 503); }
}
