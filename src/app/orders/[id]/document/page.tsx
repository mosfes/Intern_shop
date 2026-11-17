import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Logo } from "@/components/icons";
import { PrintButton } from "@/components/account/print-button";
import { OrderPaper } from "@/components/account/order-paper";
import { orderStatusLabel } from "@/lib/admin-orders";
import { bahtText } from "@/lib/baht-text";
import { formatBaht } from "@/lib/format";
import { SESSION_COOKIE } from "@/lib/google-auth";
import { prisma } from "@/lib/prisma";
import { sessionUser } from "@/lib/shop-users";
import type { Order } from "@/lib/types";

export const metadata: Metadata = { title: "ใบสั่งซื้อ", robots: { index: false } };
// A per-customer document behind the session cookie, opened in its own tab: it has no useful static shell,
// and the layout's usePathname() can't be prerendered for an order id, so let it render on the server per request.
export const instant = false;

const SHOP = {
  name: "EDM PC Shop",
  address: "250/92 ซอยรามคำแหง 112 แขวงสะพานสูง เขตสะพานสูง กรุงเทพฯ 10240",
  phone: "02-000-0000",
  email: "hello@edmpcshop.example",
};

const dateTime = (value: Date | string) => new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
}).format(new Date(value));

async function PurchaseOrder({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const orderId = decodeURIComponent(id).trim().toUpperCase();
  const user = await sessionUser((await cookies()).get(SESSION_COOKIE)?.value);
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  if (!orderId || orderId.length > 100) notFound();

  const isAdmin = user.role === "admin";
  // Paid orders and ones still waiting for payment both get a purchase order; failed checkouts don't.
  // Customers only see their own; anything else looks like a missing order.
  const payment = await prisma.checkoutPayment.findFirst({
    where: { status: { in: ["successful", "pending"] }, order: { path: "$.id", equals: orderId }, ...(isAdmin ? {} : { userId: user.googleId }) },
    orderBy: { status: "desc" },
  });
  if (!payment) notFound();
  const order = payment.order as unknown as Order;
  const customer = isAdmin
    ? await prisma.shopUser.findUnique({ where: { googleId: payment.userId }, select: { name: true, email: true, phone: true } })
    : { name: user.name, email: user.email, phone: user.phone };
  const total = payment.amount / 100;
  const discount = order.discount ?? 0;
  const paid = payment.status === "successful";
  const backHref = isAdmin ? "/admin" : paid ? "/orders" : "/checkout/complete";

  return (
    <div className="min-h-screen bg-surface-secondary px-4 py-6 print:min-h-0 print:bg-white print:p-0">
      {/* Paper is A4 with a 15 mm margin; on screen the sheet below is drawn at the same size and margin. */}
      <style>{"@page { size: A4; margin: 15mm; } @media print { html, body { background: #fff !important; } .order-paper-scale { zoom: 1 !important; } }"}</style>
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={backHref} className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline">{paid || isAdmin ? "← กลับไปหน้าคำสั่งซื้อ" : "← กลับไปหน้าชำระเงิน"}</Link>
        <PrintButton />
      </div>

      <OrderPaper>
      <article aria-label={`ใบสั่งซื้อ ${order.id}`}
        className="relative mx-auto flex min-h-[297mm] w-[210mm] flex-col bg-white p-[15mm] text-[13px] leading-relaxed text-neutral-900 shadow-md print:min-h-[265mm] print:w-auto print:p-0 print:shadow-none">
        {!paid && (
          <p className="mb-6 rounded border-2 border-amber-600 px-4 py-2 text-center text-base font-bold text-amber-700">ยังไม่ได้ชำระเงิน — คำสั่งซื้อจะยืนยันเมื่อชำระเงินสำเร็จ</p>
        )}
        {paid && order.status === "cancelled" && (
          <p className="mb-6 rounded border-2 border-red-600 px-4 py-2 text-center text-base font-bold text-red-600">คำสั่งซื้อนี้ถูกยกเลิกแล้ว</p>
        )}

        <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-neutral-900 pb-5">
          <div className="space-y-1">
            <Logo className="h-10 w-auto text-neutral-900" />
            <p className="pt-2 font-semibold">{SHOP.name}</p>
            <p className="text-neutral-600">{SHOP.address}</p>
            <p className="text-neutral-600">โทร {SHOP.phone} · {SHOP.email.split("@")[0]}<span>@</span>{SHOP.email.split("@")[1]}</p>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold">ใบสั่งซื้อ</h1>
            <p className="text-xs uppercase tracking-widest text-neutral-500">Purchase Order</p>
            <dl className="mt-3 grid grid-cols-[auto_auto] justify-end gap-x-3 gap-y-0.5 text-left">
              <dt className="text-neutral-500">เลขที่</dt><dd className="font-mono font-semibold">{order.id}</dd>
              <dt className="text-neutral-500">วันที่สั่งซื้อ</dt><dd>{dateTime(order.createdAt ?? payment.createdAt)}</dd>
              <dt className="text-neutral-500">การชำระเงิน</dt>
              <dd className={`font-semibold ${paid ? "text-green-700" : "text-amber-700"}`}>{paid ? "ชำระเงินแล้ว" : "รอชำระเงิน"}</dd>
              {paid && <><dt className="text-neutral-500">สถานะ</dt><dd>{orderStatusLabel[order.status] ?? order.status}</dd></>}
            </dl>
          </div>
        </header>

        <section className="grid gap-6 border-b border-neutral-300 py-5 grid-cols-2">
          <div>
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">ผู้สั่งซื้อ</h2>
            <p className="font-medium">{customer?.name ?? "บัญชีถูกลบ"}</p>
            {customer?.email && <p>{customer.email}</p>}
            {customer?.phone && <p>โทร {customer.phone}</p>}
          </div>
          <div>
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">ที่อยู่จัดส่ง</h2>
            <p className="whitespace-pre-wrap break-words">{order.address}</p>
            <p className="mt-1 text-neutral-600">{order.shippingMethod}{order.trackingNumber && ` · เลขพัสดุ ${order.trackingNumber}`}</p>
          </div>
        </section>

        <table className="mt-5 w-full border-collapse">
          <thead>
            <tr className="border-y border-neutral-900 text-left text-xs text-neutral-600">
              <th scope="col" className="w-10 py-2 pr-2 font-semibold">ลำดับ</th>
              <th scope="col" className="py-2 pr-2 font-semibold">รายการสินค้า</th>
              <th scope="col" className="w-16 py-2 pr-2 text-right font-semibold">จำนวน</th>
              <th scope="col" className="w-28 py-2 pr-2 text-right font-semibold">ราคาต่อหน่วย</th>
              <th scope="col" className="w-28 py-2 text-right font-semibold">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line, index) => (
              <tr key={`${line.productId}-${index}`} className="break-inside-avoid border-b border-neutral-200 align-top">
                <td className="py-2.5 pr-2 tabular-nums">{index + 1}</td>
                <td className="py-2.5 pr-2"><div className="flex items-start gap-3">
                  {line.image && <Image src={line.image} alt="" width={56} height={56} unoptimized className="h-14 w-14 shrink-0 object-contain" />}
                  <div className="min-w-0"><p>{line.name}</p><p className="break-all text-xs text-neutral-500">รหัสสินค้า {line.productId}</p></div>
                </div></td>
                <td className="py-2.5 pr-2 text-right tabular-nums">{line.quantity.toLocaleString("en-US")}</td>
                <td className="py-2.5 pr-2 text-right tabular-nums">{formatBaht(line.price)}</td>
                <td className="py-2.5 text-right tabular-nums">{formatBaht(line.price * line.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="mt-auto flex flex-wrap items-start justify-between gap-6 break-inside-avoid pt-8">
          <div className="min-w-0 flex-1 space-y-1">
            <p><span className="text-neutral-500">{paid ? "ชำระเงินโดย:" : "ช่องทางชำระเงิน:"}</span> {order.paymentMethod}</p>
            {payment.chargeId && <p className="break-all text-xs text-neutral-500">รหัสอ้างอิงการชำระเงิน {payment.chargeId}</p>}
            <p className="mt-3 inline-block rounded bg-neutral-100 px-3 py-1.5 font-medium print:bg-transparent print:px-0">({bahtText(total)})</p>
          </div>
          <dl className="grid w-72 grid-cols-[1fr_auto] gap-x-4 gap-y-1">
            <dt className="text-neutral-600">รวมค่าสินค้า</dt><dd className="text-right tabular-nums">{formatBaht(order.subtotal)}</dd>
            {discount > 0 && <><dt className="text-neutral-600">ส่วนลด{order.discountCode && ` (${order.discountCode})`}</dt><dd className="text-right tabular-nums">−{formatBaht(discount)}</dd></>}
            <dt className="text-neutral-600">ค่าจัดส่ง</dt><dd className="text-right tabular-nums">{order.shipping ? formatBaht(order.shipping) : "ฟรี"}</dd>
            <dt className="mt-1 border-y-2 border-neutral-900 py-1.5 font-bold">{paid ? "ยอดชำระทั้งสิ้น" : "ยอดที่ต้องชำระ"}</dt>
            <dd className="mt-1 border-y-2 border-neutral-900 py-1.5 text-right font-bold tabular-nums">{formatBaht(total)}</dd>
          </dl>
        </section>
      </article>
      </OrderPaper>
    </div>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p role="status" className="py-20 text-center text-sm text-muted">กำลังเตรียมใบสั่งซื้อ…</p>}>
      <PurchaseOrder params={params} />
    </Suspense>
  );
}
