"use client";

import { buttonVariants } from "@heroui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CartSkeleton } from "@/components/cart/cart-view";
import { Confirmation } from "@/components/checkout/checkout-view";
import { CHECKOUT_LOGIN_HREF } from "@/lib/auth-redirect";
import { formatBaht } from "@/lib/format";
import { clearPendingPayment, loadPendingPayment, type PendingPayment } from "@/lib/pending-payment";
import { storeActions, useHydrated, useStore } from "@/lib/store";
import type { Order } from "@/lib/types";

type View =
  | { kind: "loading" }
  | { kind: "none" }
  | { kind: "pending"; total: number; qrUrl: string | null; authorizeUri: string | null; expiresAt: string | null }
  | { kind: "paid"; order: Order }
  | { kind: "failed"; message: string };

const POLL_MS = 3000;

/**
 * Where a payment ends up — after the PromptPay QR, or after the bank / 3-D Secure redirect brings the customer back.
 * It asks the server (which asks Omise) for the real status; only a confirmed payment places the order.
 */
export function PaymentStatus() {
  const hydrated = useHydrated();
  const user = useStore((s) => s.user);
  const router = useRouter();
  const [view, setView] = useState<View>({ kind: "loading" });

  useEffect(() => {
    if (!hydrated) return;
    if (!user) { router.replace(CHECKOUT_LOGIN_HREF); return; }
    const pending: PendingPayment | null = loadPendingPayment();
    if (!pending) { const none = window.setTimeout(() => setView({ kind: "none" }), 0); return () => window.clearTimeout(none); }

    let stopped = false;
    let busy = false;
    let timer = 0;
    async function check() {
      if (busy || stopped || !pending) return;
      busy = true;
      try {
        const response = await fetch(`/api/payments/${encodeURIComponent(pending.chargeId)}`, { cache: "no-store" });
        const result = await response.json().catch(() => ({}));
        if (stopped) return;
        if (response.status === 401) { router.replace(CHECKOUT_LOGIN_HREF); return; }
        if (response.status === 404) { clearPendingPayment(); setView({ kind: "none" }); return; }
        // Network or server trouble: keep the pending payment and try again on the next tick.
        if (!response.ok) return;
        if (result.status === "successful") {
          const order: Order = result.order ?? { ...pending.order, total: result.total };
          if (!storeActions.placeOrder(order)) { router.replace(CHECKOUT_LOGIN_HREF); return; }
          clearPendingPayment();
          stopped = true;
          window.clearInterval(timer);
          setView({ kind: "paid", order });
          window.scrollTo({ top: 0 });
        } else if (result.status === "failed") {
          clearPendingPayment();
          stopped = true;
          window.clearInterval(timer);
          setView({ kind: "failed", message: result.error });
        } else {
          setView({ kind: "pending", total: result.total, qrUrl: result.qrUrl, authorizeUri: result.authorizeUri, expiresAt: result.expiresAt });
        }
      } catch { /* offline: try again next tick */ } finally { busy = false; }
    }
    void check();
    timer = window.setInterval(() => void check(), POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") void check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { stopped = true; window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [hydrated, user, router]);

  if (!hydrated || !user || view.kind === "loading") return <CartSkeleton />;
  if (view.kind === "paid") return <Confirmation order={view.order} />;
  if (view.kind === "none") {
    return (
      <Notice title="ไม่พบรายการชำระเงินที่รอดำเนินการ" text="หากคุณเพิ่งชำระเงินสำเร็จ ให้ตรวจสอบในหน้าคำสั่งซื้อของฉัน">
        <Link href="/orders" className={buttonVariants()}>คำสั่งซื้อของฉัน</Link>
        <Link href="/cart" className={buttonVariants({ variant: "secondary" })}>กลับไปที่ตะกร้า</Link>
      </Notice>
    );
  }
  if (view.kind === "failed") {
    return (
      <Notice title="ชำระเงินไม่สำเร็จ" text={view.message} danger>
        <Link href="/checkout" className={buttonVariants()}>ลองชำระเงินอีกครั้ง</Link>
        <Link href="/cart" className={buttonVariants({ variant: "secondary" })}>กลับไปที่ตะกร้า</Link>
      </Notice>
    );
  }
  return (
    <div className="mx-auto max-w-md text-center" role="status" aria-live="polite">
      <h1 className="text-2xl font-semibold tracking-tight">{view.qrUrl ? "สแกน QR เพื่อชำระเงิน" : "กำลังรอการยืนยันการชำระเงิน"}</h1>
      <p className="mt-2 text-muted">ยอดชำระ <span className="font-semibold text-foreground">{formatBaht(view.total)}</span></p>
      {view.qrUrl && (
        <div className="mt-6 rounded-xl border border-border bg-white p-4">
          {/* An Omise-hosted SVG with a signed URL — next/image has nothing to optimise here. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={view.qrUrl} alt="QR พร้อมเพย์สำหรับชำระเงิน" className="mx-auto size-64" />
        </div>
      )}
      <p className="mt-4 text-sm text-muted">
        {view.qrUrl ? "เปิดแอปธนาคาร สแกน QR แล้วยืนยันการชำระเงิน หน้านี้จะอัปเดตเองเมื่อชำระสำเร็จ" : "เมื่อธนาคารยืนยันแล้ว หน้านี้จะอัปเดตเอง กรุณาอย่าปิดหน้านี้"}
        {view.expiresAt && view.qrUrl && ` QR หมดอายุเวลา ${new Date(view.expiresAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.`}
      </p>
      {!view.qrUrl && view.authorizeUri && <a href={view.authorizeUri} className={`${buttonVariants()} mt-5`}>ไปที่หน้าอนุมัติการชำระเงิน</a>}
    </div>
  );
}

function Notice({ title, text, danger, children }: { title: string; text: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <div role={danger ? "alert" : "status"} className="mx-auto max-w-lg rounded-xl border border-dashed border-border bg-surface px-6 py-14 text-center">
      <h1 className={`text-xl font-semibold ${danger ? "text-danger" : ""}`}>{title}</h1>
      <p className="mt-2 text-sm text-muted">{text}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>
    </div>
  );
}
