import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogResults } from "@/components/catalog/catalog-results";
import { CatalogSkeleton } from "@/components/catalog/catalog-skeleton";

export const metadata: Metadata = { title: "สินค้าทั้งหมด" };

// Filtering happens on the server from the URL, so this page needs no client-side catalogue.
export default function ProductsPage({ searchParams }: PageProps<"/products">) {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <CatalogResults mode="products" searchParams={searchParams} />
    </Suspense>
  );
}
