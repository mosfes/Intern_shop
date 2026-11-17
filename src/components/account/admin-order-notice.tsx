"use client";

import { buttonVariants } from "@heroui/react";
import Link from "next/link";
import { ShieldIcon } from "@/components/icons";
import { ADMIN_ORDER_BLOCKED_MESSAGE } from "@/lib/store";

/** Replaces cart / checkout / orders content when an admin account opens a customer-only page. */
export function AdminOrderNotice() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
      <span className="mx-auto mb-4 grid size-16 place-items-center rounded-lg bg-accent-soft text-accent">
        <ShieldIcon size={30} />
      </span>
      <h2 className="text-xl font-semibold">แอดมินไม่สามารถสั่งซื้อสินค้าได้</h2>
      <p className="mt-1 text-sm text-muted">{ADMIN_ORDER_BLOCKED_MESSAGE}</p>
      <div className="mt-6 flex justify-center">
        <Link href="/admin" className={buttonVariants()}>
          ไปที่ระบบจัดการร้าน
        </Link>
      </div>
    </div>
  );
}
