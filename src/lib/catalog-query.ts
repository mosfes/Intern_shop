import { PRICE_MIN, toCardProduct, type Catalog } from "./catalog";
import { withFlashSalePrice } from "./flash-sale";
import { filterProducts, searchProducts, sortOptions, sortProducts, type CatalogFilters, type SortKey } from "./search";
import { facetMap, facetOptions, facetsForCategory, pruneSpecs, type FacetOption, type SpecSelection } from "./spec-filters";
import type { CategorySlug, Product } from "./types";

/**
 * Product listing (/products, /search) state lives in the URL and is filtered on the server, so the browser
 * gets one page of products instead of the whole catalogue. Pure functions: the client uses
 * catalogHref() to build the next URL, the server uses parseCatalogParams() + queryCatalog().
 */
export const PAGE_SIZE = 12;

export interface CatalogState {
  query: string;
  sort: SortKey;
  page: number;
  filters: CatalogFilters;
}

export interface CatalogPanel {
  /** Products per category (whole catalogue), for the category checkboxes. */
  categoryCounts: Record<string, number>;
  /** Brands (with counts) within the selected categories — all brands when none are selected. */
  brands: { brand: string; count: number }[];
  priceMax: number;
  /** Spec sub-filters for each selected category; facets with one value can't narrow anything and are left out. */
  specGroups: { slug: CategorySlug; facets: { key: string; title: string; options: FacetOption[] }[] }[];
}

export interface CatalogResult {
  products: Product[];
  total: number;
  page: number;
  pageCount: number;
  panel: CatalogPanel;
}

type Params = Record<string, string | string[] | undefined>;
const many = (value: string | string[] | undefined) => (value === undefined ? [] : Array.isArray(value) ? value : [value]);
const one = (value: string | string[] | undefined) => many(value)[0];
const number = (value: string | undefined, fallback: number) => {
  const n = value === undefined || value === "" ? NaN : Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export function defaultFilters(priceMax: number): CatalogFilters {
  return { categories: [], brands: [], price: [PRICE_MIN, priceMax], inStockOnly: false, onSaleOnly: false, specs: {} };
}

/** URL → state. Unknown categories, brands outside the selected categories and stray spec keys are dropped. */
export function parseCatalogParams(params: Params, catalog: Catalog): CatalogState {
  const categories = [...new Set(many(params.category).filter((c) => catalog.isCategorySlug(c)))] as CategorySlug[];
  const allowedBrands = new Set(catalog.brandsForCategories(categories).map((b) => b.brand));
  const brands = [...new Set(many(params.brand).filter((b) => allowedBrands.has(b)))];

  const specs: SpecSelection = {};
  for (const raw of many(params.spec)) {
    const at = raw.indexOf(":");
    const key = raw.slice(0, at);
    const value = raw.slice(at + 1);
    if (at < 1 || !value || !facetMap.has(key)) continue;
    const values = (specs[key] ??= []);
    if (!values.includes(value)) values.push(value);
  }

  const clamp = (n: number) => Math.min(catalog.priceMax, Math.max(PRICE_MIN, n));
  let min = clamp(number(one(params.min), PRICE_MIN));
  let max = clamp(number(one(params.max), catalog.priceMax));
  if (min > max) [min, max] = [max, min];

  const sortParam = one(params.sort);
  return {
    query: (one(params.q) ?? "").trim().slice(0, 100),
    sort: sortOptions.some((o) => o.id === sortParam) ? (sortParam as SortKey) : "featured",
    page: Math.max(1, Math.floor(number(one(params.page), 1))),
    filters: {
      categories,
      brands,
      price: [min, max],
      inStockOnly: one(params.stock) === "1",
      onSaleOnly: one(params.sale) === "1",
      specs: pruneSpecs(specs, categories),
    },
  };
}

/** State → URL (defaults are left out, so the plain page stays /products). */
export function catalogHref(pathname: string, state: CatalogState, priceMax: number) {
  const params = new URLSearchParams();
  const { filters } = state;
  if (state.query) params.set("q", state.query);
  for (const category of filters.categories) params.append("category", category);
  for (const brand of filters.brands) params.append("brand", brand);
  for (const [key, values] of Object.entries(filters.specs)) for (const value of values) params.append("spec", `${key}:${value}`);
  if (filters.price[0] !== PRICE_MIN) params.set("min", String(filters.price[0]));
  if (filters.price[1] !== priceMax) params.set("max", String(filters.price[1]));
  if (filters.inStockOnly) params.set("stock", "1");
  if (filters.onSaleOnly) params.set("sale", "1");
  if (state.sort !== "featured") params.set("sort", state.sort);
  if (state.page > 1) params.set("page", String(state.page));
  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}

/** Filter, sort and paginate on the server; returns one page of trimmed products plus the filter panel's data. */
export function queryCatalog(catalog: Catalog, state: CatalogState, now = Date.now()): CatalogResult {
  // Filter and sort on the price customers see right now (flash-sale prices included).
  const products = catalog.products.map((p) => withFlashSalePrice(p, now));
  const { filters } = state;
  const results = sortProducts(filterProducts(searchProducts(state.query, products, catalog.categoryMap), filters), state.sort);
  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const page = Math.min(state.page, pageCount);

  const specGroups = filters.categories.flatMap((slug) => {
    const facets = facetsForCategory(slug)
      .map((facet) => {
        const { [facet.key]: _omit, ...otherSpecs } = filters.specs; // eslint-disable-line @typescript-eslint/no-unused-vars
        const scoped = filterProducts(products, { ...filters, specs: otherSpecs });
        return { key: facet.key, title: facet.title, options: facetOptions(facet, products, scoped) };
      })
      .filter(({ key, options }) => options.length > 1 || (filters.specs[key]?.length ?? 0) > 0);
    return facets.length ? [{ slug, facets }] : [];
  });

  return {
    // The list layout shows the description, so keep it; the rest of the record isn't needed by a card.
    products: results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((p) => ({ ...toCardProduct(p), description: p.description })),
    total: results.length,
    page,
    pageCount,
    panel: { categoryCounts: catalog.categoryCounts, brands: catalog.brandsForCategories(filters.categories), priceMax: catalog.priceMax, specGroups },
  };
}
