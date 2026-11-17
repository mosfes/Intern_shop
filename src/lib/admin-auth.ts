import { type NextRequest, NextResponse } from "next/server";
import { authConfig, SESSION_COOKIE } from "./google-auth";
import { sessionUser } from "./shop-users";

export const adminJson = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

type AdminUser = NonNullable<Awaited<ReturnType<typeof sessionUser>>>;
type Authorization = { user: AdminUser; denied: null } | { user: null; denied: NextResponse };

export async function authorizeAdminSession(request: NextRequest, mutation = false): Promise<Authorization> {
  const deny = (body: unknown, status: number): Authorization => ({ user: null, denied: adminJson(body, status) });
  if (mutation && request.headers.get("origin") !== authConfig().origin) return deny({ error: "คำขอไม่ถูกต้อง" }, 403);
  const user = await sessionUser(request.cookies.get(SESSION_COOKIE)?.value);
  if (!user) return deny({ error: "กรุณาเข้าสู่ระบบ" }, 401);
  if (user.mustChangePassword) return deny({ error: "กรุณาเปลี่ยนรหัสผ่านก่อนใช้งาน", mustChangePassword: true }, 403);
  if (user.role !== "admin") return deny({ error: "เฉพาะแอดมินเท่านั้น" }, 403);
  return { user, denied: null };
}

export async function authorizeAdmin(request: NextRequest, mutation = false) {
  return (await authorizeAdminSession(request, mutation)).denied;
}
