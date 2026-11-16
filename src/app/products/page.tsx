import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogFromParams } from "@/components/catalog/catalog-from-params";
import { CatalogSkeleton } from "@/components/catalog/catalog-skeleton";

export const metadata: Metadata = { title: "สินค้าทั้งหมด" };

export default function ProductsPage() {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <CatalogFromParams mode="products" />
    </Suspense>
  );
}
