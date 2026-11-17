import "dotenv/config";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { prisma } from "../src/lib/prisma";
import { getCatalogMeta } from "../src/lib/catalog-server";

const require = createRequire(import.meta.url);
require("next/cache").cacheTag = () => {};
require("next/cache").cacheLife = () => {};

test("navigation metadata loads only categories and brands without products or external requests", async () => {
  const category = { slug: "cpu", name: "CPU", nameTh: "ซีพียู", description: "", image: "" };
  Object.defineProperty(prisma.category, "findMany", { configurable: true, value: async (args: { select: Record<string, boolean> }) => {
    assert.deepEqual(Object.keys(args.select), ["slug", "name", "nameTh", "description", "image"]);
    return [category];
  } });
  Object.defineProperty(prisma.brand, "findMany", { configurable: true, value: async () => [{ name: "AMD", logoUrl: null }] });
  Object.defineProperty(prisma.product, "findMany", { configurable: true, value: async () => { throw new Error("metadata must not query products"); } });
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("metadata must not request the external catalogue"); };
  try {
    const meta = await getCatalogMeta();
    assert.equal(meta.categories[0].image, "/images/categories/default.svg");
    assert.deepEqual(meta.brandAssets, [{ name: "AMD", logoUrl: null }]);
    assert.equal("products" in meta, false);
  } finally { globalThis.fetch = original; }
});
