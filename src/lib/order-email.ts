import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { productImageUrl } from "./order-images";
import { createOrderPdf } from "./order-pdf";
import type { Prisma } from "@/generated/prisma/client";
import { customerOrder, orderStatusLabel } from "./admin-orders";
import { prisma } from "./prisma";
import type { Order } from "./types";

const escape = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const money = (value: number) => `${Number(value).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;

/** Capture the customer-facing snapshot in the same transaction as the order change. */
export async function enqueueOrderEmail(tx: Prisma.TransactionClient, id: string, userId: string, order: Order, event: "paid" | "status" | "tracking", chargeId?: string | null) {
  const user = await tx.shopUser.findUnique({ where: { googleId: userId }, select: { email: true, name: true, phone: true } });
  if (!user?.email) return;
  const visibleOrder = customerOrder(order);
  await tx.orderEmail.create({ data: { id, recipient: user.email, event, order: JSON.parse(JSON.stringify({ ...visibleOrder, documentCustomer: user, documentChargeId: chargeId ?? null })) } });
}

export function renderOrderEmail(order: Order, event: string) {
  const title = event === "paid" ? "ยืนยันการชำระเงินและคำสั่งซื้อ" : event === "tracking" ? "อัปเดตเลขพัสดุ" : `อัปเดตสถานะ: ${orderStatusLabel[order.status] ?? order.status}`;
  const items = order.lines.map((line) => `<tr>${productImageUrl(line.image) ? `<td width="68" style="padding:10px 12px 10px 0;border-bottom:1px solid #efeeeb;vertical-align:top"><img src="${escape(productImageUrl(line.image))}" alt="${escape(line.name)}" width="56" height="56" style="display:block;object-fit:contain;border:1px solid #f0eeeb;border-radius:6px"></td>` : `<td width="68" style="border-bottom:1px solid #efeeeb"></td>`}<td style="padding:12px 0;border-bottom:1px solid #efeeeb;color:#292524;font-size:14px;line-height:1.5">${escape(line.name)}<br><span style="color:#a8a29e;font-size:12px">จำนวน ${line.quantity} × ${money(line.price)}</span></td><td align="right" style="padding:12px 0;border-bottom:1px solid #efeeeb;color:#292524;font-size:14px;white-space:nowrap">${money(line.price * line.quantity)}</td></tr>`).join("");
  const intro = event === "paid" ? "เราได้รับการชำระเงินเรียบร้อยแล้ว และกำลังเตรียมคำสั่งซื้อของคุณ" : event === "tracking" ? "เราได้อัปเดตข้อมูลการจัดส่งสำหรับคำสั่งซื้อของคุณแล้ว" : "คำสั่งซื้อของคุณมีความคืบหน้าใหม่ ดูรายละเอียดล่าสุดได้ด้านล่าง";
  const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)}</title></head><body style="margin:0;padding:0;background:#f4f2ef;font-family:Arial,'Noto Sans Thai',sans-serif;color:#292524"><div style="display:none;max-height:0;overflow:hidden">${escape(title)} · ${escape(order.id)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f2ef"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden"><tr><td style="background:#1c1917;padding:26px 30px"><img src="cid:edm-logo" width="126" alt="EDM PC Shop" style="display:block;border:0;color:#ffffff;font-size:18px;font-weight:bold"></td></tr><tr><td style="padding:32px 30px 12px"><p style="margin:0 0 10px;color:#c45d31;font-size:12px;font-weight:bold;letter-spacing:1px">ORDER UPDATE</p><h1 style="margin:0;color:#1c1917;font-size:24px;line-height:1.4">${escape(title)}</h1><p style="margin:12px 0 24px;color:#78716c;font-size:15px;line-height:1.8">${escape(intro)}</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#faf7f4;border:1px solid #f0e8e2;border-radius:10px"><tr><td style="padding:18px 20px"><p style="margin:0 0 6px;color:#a8a29e;font-size:12px">หมายเลขคำสั่งซื้อ</p><p style="margin:0 0 14px;color:#1c1917;font-size:18px;font-weight:bold">#${escape(order.id)}</p><p style="margin:0;color:#57534e;font-size:14px">สถานะ: <strong style="color:#c45d31">${escape(orderStatusLabel[order.status] ?? order.status)}</strong>${order.trackingNumber ? `<br><span style="display:inline-block;margin-top:8px">เลขพัสดุ: <strong>${escape(order.trackingNumber)}</strong></span>` : ""}</p></td></tr></table><h2 style="margin:26px 0 4px;color:#1c1917;font-size:16px">รายการสินค้า</h2><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${items}<tr><td style="padding:18px 0;font-size:15px;font-weight:bold">ยอดชำระทั้งหมด</td><td align="right" style="padding:18px 0;color:#c45d31;font-size:18px;font-weight:bold;white-space:nowrap">${money(order.total)}</td></tr></table><p style="margin:8px 0 4px;color:#78716c;font-size:13px;line-height:1.7">ใบสั่งซื้อฉบับ PDF แนบอยู่ในอีเมลนี้ คุณสามารถเปิดดูหรือพิมพ์เก็บไว้ได้</p></td></tr><tr><td style="padding:24px 30px 28px;color:#a8a29e;font-size:12px;line-height:1.7;border-top:1px solid #f2f0ed">ขอบคุณที่ไว้วางใจ EDM PC Shop<br>อีเมลนี้ส่งโดยระบบอัตโนมัติ</td></tr></table></td></tr></table></body></html>`;
  return { subject: `${title} · ${order.id}`, html };
}

/** Claim a row before sending. A stale claim can be retried after a process crash. */
export async function sendOrderEmail(id: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) return false;
  const now = new Date();
  const claimed = await prisma.orderEmail.updateMany({ where: { id, OR: [{ state: "pending" }, { state: "sending", lockedAt: { lt: new Date(now.getTime() - 5 * 60_000) } }] }, data: { state: "sending", lockedAt: now, attempts: { increment: 1 } } });
  if (!claimed.count) return false;
  try {
    const job = await prisma.orderEmail.findUniqueOrThrow({ where: { id } });
    const order = job.order as unknown as Order;
    const { subject, html } = renderOrderEmail(order, job.event);
    const [pdf, logo] = await Promise.all([createOrderPdf(order, true, (order as Order & { documentCustomer?: { name: string; email: string; phone: string | null }; documentChargeId?: string }).documentCustomer, (order as Order & { documentChargeId?: string }).documentChargeId), readFile(join(process.cwd(), "public", "brand", "email-logo.png"))]);
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `order-email/${id}` }, body: JSON.stringify({ from, to: [job.recipient], subject, html, attachments: [{ filename: `order-${order.id.replace(/[^a-zA-Z0-9_-]/g, "")}.pdf`, content: pdf.toString("base64"), content_type: "application/pdf" }, { filename: "edm-logo.png", content: logo.toString("base64"), content_type: "image/png", content_id: "edm-logo" }] }), signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Resend HTTP ${response.status}`);
    await prisma.orderEmail.updateMany({ where: { id, state: "sending", lockedAt: now }, data: { state: "sent", sentAt: new Date(), lockedAt: null } });
    return true;
  } catch (error) {
    console.error("Order email delivery failed", { id, error: error instanceof Error ? error.message : "unknown" });
    await prisma.orderEmail.updateMany({ where: { id, state: "sending", lockedAt: now }, data: { state: "pending", lockedAt: null } });
    return false;
  }
}

export async function retryOrderEmails() {
  const jobs = await prisma.orderEmail.findMany({ where: { OR: [{ state: "pending" }, { state: "sending", lockedAt: { lt: new Date(Date.now() - 5 * 60_000) } }] }, orderBy: { createdAt: "asc" }, take: 20, select: { id: true } });
  let sent = 0;
  for (const job of jobs) if (await sendOrderEmail(job.id)) sent++;
  return { attempted: jobs.length, sent };
}
