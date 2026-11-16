import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogFromParams } from "@/components/catalog/catalog-from-params";
import { CatalogSkeleton } from "@/components/catalog/catalog-skeleton";

export const metadata: Metadata = { title: "ค้นหาสินค้า" };

export default function SearchPage() {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <CatalogFromParams mode="search" />
    </Suspense>
  );
}
