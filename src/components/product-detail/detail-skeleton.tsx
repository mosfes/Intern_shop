import { Skeleton } from "@heroui/react";

export function ProductDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6" aria-busy="true" aria-label="กำลังโหลดสินค้า">
      <Skeleton className="mb-6 h-4 w-60 rounded-md" />
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
        <Skeleton className="aspect-square w-full rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-5 w-48 rounded-md" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
