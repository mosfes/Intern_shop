import { type NextRequest, NextResponse } from "next/server";
import { authConfig, SESSION_COOKIE } from "@/lib/google-auth";
import { prisma } from "@/lib/prisma";
import { sessionUser } from "@/lib/shop-users";

const MAX_LINES = 200;
const MAX_QUANTITY = 999;
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** The signed-in customer's saved cart. Admins don't shop, so they have none. */
async function customer(request: NextRequest) {
  const user = await sessionUser(request.cookies.get(SESSION_COOKIE)?.value);
  return user && user.role !== "admin" && !user.mustChangePassword ? user : null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await customer(request);
    if (!user) return json({ error: "กรุณาเข้าสู่ระบบ" }, 401);
    const rows = await prisma.cartItem.findMany({ where: { userId: user.googleId }, orderBy: { updatedAt: "asc" } });
    return json({ cart: rows.map((r) => ({ productId: r.productId, quantity: r.quantity, selected: r.selected })) });
  } catch { return json({ error: "ไม่สามารถโหลดตะกร้าได้" }, 503); }
}

/** Replaces the whole saved cart with the one the browser sends. */
export async function PUT(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== authConfig().origin) return json({ error: "คำขอไม่ถูกต้อง" }, 403);
    const user = await customer(request);
    if (!user) return json({ error: "กรุณาเข้าสู่ระบบ" }, 401);
    let body;
    try { body = await request.json(); } catch { return json({ error: "ข้อมูลไม่ถูกต้อง" }, 400); }
    if (!body || !Array.isArray(body.cart) || body.cart.length > MAX_LINES) return json({ error: "ข้อมูลไม่ถูกต้อง" }, 400);
    const lines = new Map<string, { productId: string; quantity: number; selected: boolean }>();
    for (const line of body.cart) {
      if (!line || typeof line.productId !== "string" || !line.productId || line.productId.length > 100) return json({ error: "ข้อมูลไม่ถูกต้อง" }, 400);
      if (!Number.isInteger(line.quantity) || line.quantity < 1) return json({ error: "ข้อมูลไม่ถูกต้อง" }, 400);
      lines.set(line.productId, { productId: line.productId, quantity: Math.min(line.quantity, MAX_QUANTITY), selected: line.selected !== false });
    }
    await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { userId: user.googleId } }),
      prisma.cartItem.createMany({ data: [...lines.values()].map((l) => ({ ...l, userId: user.googleId })) }),
    ]);
    return json({ ok: true });
  } catch { return json({ error: "ไม่สามารถบันทึกตะกร้าได้" }, 503); }
}
