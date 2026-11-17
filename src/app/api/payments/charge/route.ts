import { type NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { AddressError, formatAddressLine, validateAddress } from "@/lib/addresses";
import { shippingOptions } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { settleCharge } from "@/lib/payment-settlement";
import { orderIdForCharge } from "@/lib/pending-payment";
import type { Order } from "@/lib/types";
import { getCatalogData } from "@/lib/catalog-server";
import { customerFromRequest } from "@/lib/customer-session";
import { DiscountCodeError, normalizeCode } from "@/lib/discount-codes";
import { findDiscountCode } from "@/lib/discount-codes-server";
import { authConfig } from "@/lib/google-auth";
import { createCharge, failureReason, OmiseError, omiseConfigured } from "@/lib/omise";
import { isPaymentMethod, paymentLabel, PaymentError, priceOrder, toSatang } from "@/lib/payments";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const QR_LIFETIME_MS = 30 * 60 * 1000;

/**
 * Starts a payment: { method, token?, lines: [{ productId, quantity }], shipping, discountCode? }.
 * The amount is recomputed here from the catalogue and the discount code; the browser's totals are ignored.
 * Cards arrive as an Omise.js token (card numbers never reach this server).
 */
export async function POST(request: NextRequest) {
  try {
    const { origin } = authConfig();
    if (request.headers.get("origin") !== origin) return json({ error: "คำขอไม่ถูกต้อง" }, 403);
    const user = await customerFromRequest(request);
    if (!user?.googleId) return json({ error: "กรุณาเข้าสู่ระบบ" }, 401);
    if (!omiseConfigured()) return json({ error: "ระบบชำระเงินยังไม่เปิดใช้งาน กรุณาติดต่อร้านค้า" }, 503);
    let body: Record<string, unknown>;
    try { body = await request.json(); } catch { return json({ error: "ข้อมูลไม่ถูกต้อง" }, 400); }
    const method = body?.method;
    if (!isPaymentMethod(method)) return json({ error: "กรุณาเลือกวิธีการชำระเงิน" }, 400);
    if (method === "card" && !(typeof body.token === "string" && /^tokn_[A-Za-z0-9_]+$/.test(body.token))) return json({ error: "ข้อมูลบัตรไม่ถูกต้อง" }, 400);

    const code = normalizeCode(body.discountCode);
    const { products } = await getCatalogData();
    const price = priceOrder(body.lines, new Map(products.map((product) => [product.id, product])), body.shipping, code ? await findDiscountCode(code) : null);
    const address = validateAddress(body.address);
    const checkoutId = randomUUID();
    const order: Order = {
      id: checkoutId,
      createdAt: new Date().toISOString(),
      status: "processing",
      lines: (body.lines as { productId: string; quantity: number }[]).map((line) => {
        const product = products.find((item) => item.id === line.productId)!;
        return { productId: product.id, name: product.name, image: product.images[0] ?? "", price: product.price, quantity: line.quantity };
      }),
      ...price,
      ...(price.discount > 0 ? { discountCode: code } : {}),
      shippingMethod: shippingOptions.find((option) => option.id === body.shipping)!.label,
      paymentMethod: paymentLabel(method),
      address: `${address.fullName} · ${formatAddressLine(address)} · ${address.phone}`,
    };
    // Persist before the bank can take payment. The webhook can locate this snapshot
    // through metadata even if it arrives before this HTTP request finishes.
    await prisma.checkoutPayment.create({ data: {
      id: checkoutId, userId: user.googleId, amount: toSatang(price.total), order: JSON.parse(JSON.stringify(order)),
    } });

    const charge = await createCharge({
      amount: String(toSatang(price.total)),
      currency: "THB",
      description: `EDM PC Shop · ${paymentLabel(method)}`,
      return_uri: `${origin}/checkout/complete`,
      "metadata[userId]": user.googleId,
      "metadata[checkoutId]": checkoutId,
      ...(price.discount > 0 ? { "metadata[discountCode]": code } : {}),
      ...(method === "card" ? { card: body.token as string } : { "source[type]": method }),
      ...(method === "promptpay" ? { expires_at: new Date(Date.now() + QR_LIFETIME_MS).toISOString().replace(/\.\d+Z$/, "Z") } : {}),
    });
    const settledOrder = await settleCharge(charge);
    const failed = charge.status === "failed" || charge.status === "expired";
    if (failed) return json({ error: failureReason(charge) }, 402);
    // A card that already succeeded can still carry an authorize_uri; only a pending charge needs the customer to go there.
    return json({ chargeId: charge.id, status: charge.status, authorizeUri: charge.status === "pending" ? charge.authorize_uri : null, total: price.total, discount: price.discount, shipping: price.shipping, order: settledOrder ?? { ...order, id: orderIdForCharge(charge.id) } }, 201);
  } catch (error) {
    if (error instanceof AddressError) return json({ error: "กรุณาตรวจสอบข้อมูลที่อยู่จัดส่ง" }, 400);
    if (error instanceof PaymentError || error instanceof DiscountCodeError || error instanceof OmiseError) return json({ error: error.message }, error.status);
    return json({ error: "เริ่มการชำระเงินไม่สำเร็จ กรุณาลองอีกครั้ง" }, 503);
  }
}
