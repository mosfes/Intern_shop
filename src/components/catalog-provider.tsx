"use client";

import { createContext, use, useMemo, type ReactNode } from "react";
import { usePriceTime } from "@/components/product/use-priced-product";
import { withFlashSalePrice } from "@/lib/flash-sale";
import { buildCatalog, type Catalog, type CatalogData, type CatalogMeta } from "@/lib/catalog";

const CatalogContext = createContext<{ catalog: Catalog; hasProducts: boolean } | null>(null);

/**
 * Categories, brands and logos for every page (root layout). Holds no products, so the product list
 * isn't serialized into pages that don't need it — use <CatalogProducts> (server) for routes that do.
 */
export function CatalogMetaProvider({ data, children }: { data: CatalogMeta; children: ReactNode }) {
  const value = useMemo(() => ({ catalog: buildCatalog({ ...data, products: [] }), hasProducts: false }), [data]);
  return <CatalogContext value={value}>{children}</CatalogContext>;
}

/** The full catalogue, product list included. Rendered by <CatalogProducts> around the routes that need it. */
export function CatalogProvider({ data, children }: { data: CatalogData; children: ReactNode }) {
  const now = usePriceTime(data.products);
  const value = useMemo(() => ({ catalog: buildCatalog({ ...data, products: data.products.map((product) => withFlashSalePrice(product, now)) }), hasProducts: true }), [data, now]);
  return <CatalogContext value={value}>{children}</CatalogContext>;
}

/** Full catalogue (products, productMap, filters …). Only inside a route wrapped in <CatalogProducts>. */
export function useCatalog(): Catalog {
  const context = use(CatalogContext);
  if (!context) throw new Error("useCatalog must be used inside <CatalogProvider>");
  if (!context.hasProducts) throw new Error("useCatalog needs the product list — wrap this route in <CatalogProducts>, or use useCatalogMeta()");
  return context.catalog;
}

export type CatalogMetaView = Pick<Catalog, "categories" | "categoryMap" | "isCategorySlug" | "managedBrands" | "uploadedLogoUrl">;

/** Categories, brands and logos — available on every page. */
export function useCatalogMeta(): CatalogMetaView {
  const context = use(CatalogContext);
  if (!context) throw new Error("useCatalogMeta must be used inside <CatalogMetaProvider>");
  return context.catalog;
}
