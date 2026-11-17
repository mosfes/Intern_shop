import type { ReactNode } from "react";
import { CatalogProvider } from "@/components/catalog-provider";
import { getCatalogData } from "@/lib/catalog-server";

/** Server wrapper: loads the (cached) full catalogue and makes it available to useCatalog() below it. */
export async function CatalogProducts({ children }: { children: ReactNode }) {
  return <CatalogProvider data={await getCatalogData()}>{children}</CatalogProvider>;
}
