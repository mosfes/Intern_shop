"use client";

import { useSearchParams } from "next/navigation";
import { useCatalog } from "@/components/catalog-provider";
import { sortOptions, type SortKey } from "@/lib/search";
import { Catalog } from "./catalog";

/** Reads the URL once and seeds the catalogue; remounts when the URL changes. */
export function CatalogFromParams({ mode }: { mode: "products" | "search" }) {
  const params = useSearchParams();
  const { brands, isCategorySlug } = useCatalog();
  const category = params.getAll("category").filter(isCategorySlug);
  const brand = params.getAll("brand").filter((b) => brands.includes(b));
  const sortParam = params.get("sort");
  const sort = sortOptions.some((o) => o.id === sortParam) ? (sortParam as SortKey) : undefined;

  return (
    <Catalog
      key={params.toString()}
      mode={mode}
      initialQuery={params.get("q") ?? ""}
      initialSort={sort}
      initialFilters={{
        categories: category,
        brands: brand,
        onSaleOnly: params.get("sale") === "1",
      }}
    />
  );
}
