/**
 * Replaces the data in the mockapi.io "products" and "categories" resources with
 * output/mockapi/*.json (build those first with `npm run mockapi:export`).
 * Every record already in those resources is deleted, then the JSON is posted in order,
 * so mockapi ids follow the file order (1, 2, 3…).
 * Run: npx tsx scripts/push-to-mockapi.ts
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";

const base = process.env.MOCKAPI_BASE_URL?.replace(/\/$/, "");
if (!base) throw new Error("Missing MOCKAPI_BASE_URL in .env");

async function api<T>(url: string, init?: RequestInit, attempt = 1): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  if (res.status === 429 && attempt <= 5) {
    await new Promise((r) => setTimeout(r, attempt * 1000));
    return api(url, init, attempt + 1);
  }
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${url} → HTTP ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function replaceResource(resource: string, file: string) {
  const items: object[] = JSON.parse(await readFile(path.join(process.cwd(), "output", "mockapi", file), "utf8"));

  const existing = await api<{ id: string }[]>(`${base}/${resource}`);
  for (const { id } of existing) await api(`${base}/${resource}/${id}`, { method: "DELETE" });

  // Sequential so ids are assigned in file order.
  for (const item of items) await api(`${base}/${resource}`, { method: "POST", body: JSON.stringify(item) });

  const after = await api<object[]>(`${base}/${resource}`);
  console.log(`✓ ${resource}: removed ${existing.length}, posted ${items.length}, now ${after.length}`);
}

async function main() {
  await replaceResource("categories", "categories.json");
  await replaceResource("products", "products.json");
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
