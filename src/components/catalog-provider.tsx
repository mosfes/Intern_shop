"use client";

import { createContext, use, useMemo, type ReactNode } from "react";
import { buildCatalog, type Catalog, type CatalogData } from "@/lib/catalog";

const CatalogContext = createContext<Catalog | null>(null);

/** Makes the API catalogue (loaded once on the server) available to client components. */
export function CatalogProvider({ data, children }: { data: CatalogData; children: ReactNode }) {
  const catalog = useMemo(() => buildCatalog(data), [data]);
  return <CatalogContext value={catalog}>{children}</CatalogContext>;
}

export function useCatalog(): Catalog {
  const catalog = use(CatalogContext);
  if (!catalog) throw new Error("useCatalog must be used inside <CatalogProvider>");
  return catalog;
}
