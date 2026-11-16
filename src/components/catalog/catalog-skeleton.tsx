import { Skeleton } from "@heroui/react";

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-2.5 p-4">
        <Skeleton className="h-3 w-16 rounded-md" />
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-2/3 rounded-md" />
        <Skeleton className="h-6 w-24 rounded-md" />
        <div className="flex justify-between pt-1">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function CatalogSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-8 pt-6 sm:px-6" aria-busy="true" aria-label="กำลังโหลดสินค้า">
      <Skeleton className="mb-5 h-4 w-48 rounded-md" />
      <Skeleton className="mb-3 h-9 w-64 rounded-lg" />
      <Skeleton className="mb-8 h-4 w-96 max-w-full rounded-md" />
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <Skeleton className="hidden h-[560px] rounded-xl lg:block" />
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }, (_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
