import { Skeleton } from "@heroui/react";
import { Container } from "@/components/ui/section";
import type { AdminSection } from "./admin-shell";

function HeadingSkeleton() {
  return <div className="space-y-2"><Skeleton className="h-4 w-28 rounded-md" /><Skeleton className="h-10 w-56 max-w-full rounded-lg" /><Skeleton className="h-5 w-80 max-w-full rounded-md" /></div>;
}

function RowsSkeleton({ count = 5 }: { count?: number }) {
  return <div className="divide-y divide-border">{Array.from({ length: count }, (_, index) => <div key={index} className="flex items-center gap-3 px-5 py-4 sm:px-6">
    <Skeleton className="size-10 shrink-0 rounded-full" />
    <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-4 w-36 max-w-full rounded-md" /><Skeleton className="h-3 w-48 max-w-full rounded-md" /></div>
    <Skeleton className="hidden h-4 w-32 rounded-md md:block" />
    <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
    <Skeleton className="hidden size-8 shrink-0 rounded-lg sm:block" />
  </div>)}</div>;
}

export function AdminContentSkeleton({ section, includeHeading = true }: { section: AdminSection; includeHeading?: boolean }) {
  const overview = section === "overview";
  return <div role="status" aria-busy="true" aria-label="กำลังโหลดข้อมูล" className="space-y-6">
    <span className="sr-only">กำลังโหลดข้อมูล…</span>
    <div aria-hidden="true" className="space-y-6">
      {includeHeading && <HeadingSkeleton />}
      {overview && <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-5 sm:p-6"><Skeleton className="size-14 shrink-0 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-28 rounded-md" /><Skeleton className="h-6 w-44 max-w-full rounded-md" /><Skeleton className="h-4 w-56 max-w-full rounded-md" /></div></div>}
      <div className={overview ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"}>
        {Array.from({ length: overview ? 3 : 4 }, (_, index) => <div key={index} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 sm:gap-4 sm:p-5"><Skeleton className="size-11 shrink-0 rounded-lg" /><div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-4 w-24 max-w-full rounded-md" /><Skeleton className="h-7 w-12 rounded-md" />{overview && <Skeleton className="h-3 w-32 max-w-full rounded-md" />}</div></div>)}
      </div>
      {overview ? <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="rounded-xl border border-border bg-surface"><Skeleton className="mx-5 mt-5 h-6 w-48 rounded-md" /><RowsSkeleton /></div>
        <div className="space-y-5 rounded-xl border border-border bg-surface p-5 sm:p-6"><Skeleton className="h-6 w-40 rounded-md" />{[0, 1].map((index) => <div key={index} className="flex items-center gap-3"><Skeleton className="size-10 shrink-0 rounded-lg" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-28 rounded-md" /><Skeleton className="h-3 w-40 max-w-full rounded-md" /></div></div>)}</div>
      </div> : <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="grid gap-3 border-b border-border p-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"><Skeleton className="h-10 w-full rounded-lg" /><Skeleton className="h-10 w-full rounded-lg" /></div>
        <div className="flex justify-between gap-4 border-b border-border bg-surface-secondary/50 px-6 py-4">{[0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-3 w-20 max-w-full rounded-md" />)}</div>
        <RowsSkeleton count={6} />
        <div className="border-t border-border px-6 py-4"><Skeleton className="h-3 w-36 rounded-md" /></div>
      </div>}
    </div>
  </div>;
}

export function AdminPageSkeleton() {
  return <div className="min-h-dvh" aria-busy="true">
    <div aria-hidden="true" className="border-b border-border bg-surface"><Container className="flex h-20 items-center justify-between gap-4"><Skeleton className="h-9 w-36 rounded-lg" /><div className="flex items-center gap-3"><Skeleton className="hidden h-5 w-32 rounded-md sm:block" /><Skeleton className="size-10 rounded-full" /></div></Container></div>
    <Container className="pb-16 pt-8 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start lg:gap-6">
      <div aria-hidden="true" className="hidden space-y-4 rounded-xl border border-border bg-surface p-5 lg:block"><Skeleton className="h-3 w-20 rounded-md" />{[0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-9 w-full rounded-lg" />)}<div className="border-t border-border pt-4"><Skeleton className="h-8 w-full rounded-lg" /></div></div>
      <div className="min-w-0"><AdminContentSkeleton section="admin" /></div>
    </Container>
  </div>;
}
