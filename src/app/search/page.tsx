import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogResults } from "@/components/catalog/catalog-results";
import { CatalogSkeleton } from "@/components/catalog/catalog-skeleton";

export const metadata: Metadata = { title: "ค้นหาสินค้า" };

// Filtering happens on the server from the URL, so this page needs no client-side catalogue.
export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <CatalogResults mode="search" searchParams={searchParams} />
    </Suspense>
  );
}
