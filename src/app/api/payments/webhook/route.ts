import { NextResponse } from "next/server";
import { getCharge, OmiseError, omiseConfigured } from "@/lib/omise";
import { verifyOmiseSignature, webhookChargeId } from "@/lib/omise-webhook";
import { settleCharge } from "@/lib/payment-settlement";

export async function POST(request: Request) {
  if (!omiseConfigured()) return NextResponse.json({ error: "Payments unavailable" }, { status: 503 });
  const raw = await request.text();
  const secret = process.env.OMISE_WEBHOOK_SECRET;
  if (secret && !verifyOmiseSignature(raw, request.headers.get("omise-signature"), request.headers.get("omise-signature-timestamp"), secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  let event: unknown;
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const id = webhookChargeId(event);
  if (!id) return NextResponse.json({ received: true });
  try {
    // Independent API verification also protects installations without a webhook secret.
    // Never accept amount, userId or payment status from the incoming payload.
    await settleCharge(await getCharge(id));
    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof OmiseError && error.status === 404) return NextResponse.json({ received: true });
    console.error("Omise webhook settlement failed", { chargeId: id });
    return NextResponse.json({ error: "Unable to settle payment" }, { status: 503 });
  }
}
