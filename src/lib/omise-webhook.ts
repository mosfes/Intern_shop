import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyOmiseSignature(body: string, signature: string | null, timestamp: string | null, secret: string) {
  if (!signature || !timestamp || !/^\d+$/.test(timestamp)) return false;
  const key = Buffer.from(secret, "base64");
  if (!key.length) return false;
  const expected = createHmac("sha256", key).update(`${timestamp}.${body}`).digest();
  return signature.split(",").some((value) => {
    const hex = value.trim();
    return /^[a-fA-F0-9]{64}$/.test(hex) && timingSafeEqual(Buffer.from(hex, "hex"), expected);
  });
}

export function webhookChargeId(event: unknown): string | null {
  if (!event || typeof event !== "object") return null;
  const e = event as { object?: unknown; key?: unknown; data?: { id?: unknown; object?: unknown } };
  if (e.object !== "event" || !["charge.create", "charge.complete", "charge.update", "charge.expire"].includes(String(e.key))) return null;
  return e.data?.object === "charge" && typeof e.data.id === "string" && /^chrg_[A-Za-z0-9_]+$/.test(e.data.id) ? e.data.id : null;
}
