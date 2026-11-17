import { connection } from "next/server";
import { getCatalog } from "@/lib/catalog-server";
import { parseCatalogParams, queryCatalog } from "@/lib/catalog-query";
import { Catalog } from "./catalog";

/** Server side of the product listing: reads the URL, filters the cached catalogue and sends one page. */
export async function CatalogResults({ mode, searchParams }: { mode: "products" | "search"; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Results depend on the URL and on flash-sale prices at this moment (Date.now()), so render per request.
  await connection();
  const [params, catalog] = await Promise.all([searchParams, getCatalog()]);
  const state = parseCatalogParams(params, catalog);
  const result = queryCatalog(catalog, state);
  return <Catalog mode={mode} state={{ ...state, page: result.page }} result={result} />;
}
