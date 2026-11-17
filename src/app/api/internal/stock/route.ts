import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { maintainStock } from "@/lib/stock-maintenance";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (!secret || Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try { return NextResponse.json(await maintainStock(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Unable to reconcile stock" }, { status: 503 }); }
}
