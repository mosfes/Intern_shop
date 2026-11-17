import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogFromParams } from "@/components/catalog/catalog-from-params";
import { CatalogSkeleton } from "@/components/catalog/catalog-skeleton";
import { CatalogProducts } from "@/components/catalog-products";

export const metadata: Metadata = { title: "ค้นหาสินค้า" };

export default function SearchPage() {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <CatalogProducts>
        <CatalogFromParams mode="search" />
      </CatalogProducts>
    </Suspense>
  );
}
