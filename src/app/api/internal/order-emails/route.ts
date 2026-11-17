import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { retryOrderEmails } from "@/lib/order-email";

// Invoke from a scheduled job with Authorization: Bearer <CRON_SECRET>.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (!secret || Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) return NextResponse.json({ error: "Email not configured" }, { status: 503 });
  try { return NextResponse.json(await retryOrderEmails()); }
  catch { return NextResponse.json({ error: "Unable to retry order emails" }, { status: 503 }); }
}
