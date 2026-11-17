import assert from "node:assert/strict";
import { test } from "node:test";
import { categories } from "../src/data/categories";
import { products } from "../src/data/products";
import { buildCatalog } from "../src/lib/catalog";
import { catalogHref, PAGE_SIZE, parseCatalogParams, queryCatalog } from "../src/lib/catalog-query";

const catalog = buildCatalog({ products, categories });

test("URL state round-trips and defaults stay out of the URL", () => {
  const state = parseCatalogParams({}, catalog);
  assert.equal(catalogHref("/products", state, catalog.priceMax), "/products");

  const params = { q: "ryzen", category: "cpu", brand: "AMD", spec: "cpu.socket:AM5", min: "1000", max: "20000", stock: "1", sale: "1", sort: "price-asc", page: "2" };
  const parsed = parseCatalogParams(params, catalog);
  const href = catalogHref("/search", parsed, catalog.priceMax);
  const again = parseCatalogParams(Object.fromEntries([...new URLSearchParams(href.split("?")[1])].map(([k]) => [k, new URLSearchParams(href.split("?")[1]).getAll(k)])), catalog);
  assert.deepEqual(again, parsed);
  assert.deepEqual(parsed.filters.specs, { "cpu.socket": ["AM5"] });
});

test("invalid URL values are dropped or clamped", () => {
  const state = parseCatalogParams({ category: ["cpu", "nope"], brand: "Not A Brand", spec: ["bad", "gpu.unknown:x", "cpu.socket:AM5"], min: "-50", max: "abc", sort: "hack", page: "0" }, catalog);
  assert.deepEqual(state.filters.categories, ["cpu"]);
  assert.deepEqual(state.filters.brands, []);
  assert.deepEqual(state.filters.price, [0, catalog.priceMax]);
  assert.equal(state.sort, "featured");
  assert.equal(state.page, 1);
  // A spec filter for a category that isn't selected is pruned.
  assert.deepEqual(parseCatalogParams({ spec: "cpu.socket:AM5" }, catalog).filters.specs, {});
});

test("server query returns one trimmed page and panel data", () => {
  const all = queryCatalog(catalog, parseCatalogParams({}, catalog));
  assert.equal(all.total, products.length);
  assert.equal(all.products.length, Math.min(PAGE_SIZE, products.length));
  assert.ok(all.products.every((p) => p.specifications.length === 0 && p.images.length === 1), "cards don't carry the full record");

  const last = queryCatalog(catalog, parseCatalogParams({ page: "999" }, catalog));
  assert.equal(last.page, last.pageCount, "page is clamped to the last page");

  const cpu = queryCatalog(catalog, parseCatalogParams({ category: "cpu" }, catalog));
  assert.ok(cpu.products.every((p) => p.category === "cpu"));
  assert.ok(cpu.panel.specGroups[0]?.facets.some((f) => f.key === "cpu.socket"));
  assert.ok(cpu.panel.brands.length > 0 && cpu.panel.brands.every((b) => products.some((p) => p.category === "cpu" && p.brand === b.brand)));
});
