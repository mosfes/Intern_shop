import { type NextRequest, NextResponse } from "next/server";
import { AddressError, MAX_ADDRESSES, validateAddress } from "@/lib/addresses";
import { customerFromRequest } from "@/lib/customer-session";
import { authConfig } from "@/lib/google-auth";
import { prisma } from "@/lib/prisma";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

const publicAddress = (a: { id: string; label: string; fullName: string; phone: string; address: string; province: string; district: string; subdistrict: string; postcode: string; isDefault: boolean }) => ({
  id: a.id, label: a.label, fullName: a.fullName, phone: a.phone, address: a.address,
  province: a.province, district: a.district, subdistrict: a.subdistrict, postcode: a.postcode, isDefault: a.isDefault,
});

/** The signed-in customer's saved addresses, default first. */
export async function GET(request: NextRequest) {
  try {
    const user = await customerFromRequest(request);
    if (!user) return json({ error: "กรุณาเข้าสู่ระบบ" }, 401);
    const rows = await prisma.customerAddress.findMany({ where: { userId: user.googleId }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
    return json({ addresses: rows.map(publicAddress) });
  } catch { return json({ error: "ไม่สามารถโหลดที่อยู่ได้" }, 503); }
}

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== authConfig().origin) return json({ error: "คำขอไม่ถูกต้อง" }, 403);
    const user = await customerFromRequest(request);
    if (!user) return json({ error: "กรุณาเข้าสู่ระบบ" }, 401);
    let body;
    try { body = await request.json(); } catch { return json({ error: "ข้อมูลไม่ถูกต้อง" }, 400); }
    let data;
    try { data = validateAddress(body); } catch (error) {
      if (error instanceof AddressError) return json({ error: "ข้อมูลที่อยู่ไม่ถูกต้อง", field: error.message }, 400);
      throw error;
    }
    const created = await prisma.$transaction(async (tx) => {
      const count = await tx.customerAddress.count({ where: { userId: user.googleId } });
      if (count >= MAX_ADDRESSES) return null;
      const isDefault = count === 0 || body.isDefault === true;
      if (isDefault) await tx.customerAddress.updateMany({ where: { userId: user.googleId }, data: { isDefault: false } });
      return tx.customerAddress.create({ data: { ...data, userId: user.googleId, isDefault } });
    });
    if (!created) return json({ error: `บันทึกที่อยู่ได้สูงสุด ${MAX_ADDRESSES} รายการ` }, 409);
    return json({ address: publicAddress(created) }, 201);
  } catch { return json({ error: "ไม่สามารถบันทึกที่อยู่ได้" }, 503); }
}
