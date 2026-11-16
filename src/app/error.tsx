"use client";

import { Button } from "@heroui/react";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <p className="text-sm font-medium text-danger">เกิดข้อผิดพลาด</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">ขออภัย มีบางอย่างผิดพลาด</h1>
      <p className="mt-2 text-muted">กรุณาลองใหม่อีกครั้ง หากยังพบปัญหา โปรดติดต่อทีมงาน</p>
      <Button className="mt-6" onPress={reset}>ลองอีกครั้ง</Button>
    </div>
  );
}
