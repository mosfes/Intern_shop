import { buttonVariants } from "@heroui/react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <p className="text-sm font-medium text-accent">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">ไม่พบหน้าที่คุณต้องการ</h1>
      <p className="mt-2 text-muted">หน้านี้อาจถูกย้ายหรือไม่มีอยู่ ลองค้นหาสินค้าหรือกลับไปหน้าแรก</p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className={buttonVariants()}>กลับหน้าแรก</Link>
        <Link href="/products" className={buttonVariants({ variant: "secondary" })}>ดูสินค้าทั้งหมด</Link>
      </div>
    </div>
  );
}
