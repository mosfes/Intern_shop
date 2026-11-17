import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { AdminViewCache } from "../src/lib/admin-view-cache";

afterEach(() => mock.restoreAll());

test("snapshots survive navigation, notify readers, and stay within their admin session", () => {
  const cache = new AdminViewCache();
  let changes = 0;
  const unsubscribe = cache.subscribe(() => changes++);
  cache.set("products", ["first"]);
  cache.set<string[]>("products", (current) => [...current!, "second"]);
  assert.deepEqual(cache.get("products"), ["first", "second"]);
  assert.equal(new AdminViewCache().get("products"), null);
  assert.equal(changes, 2);
  unsubscribe();
  cache.set("overview", {});
  assert.equal(changes, 2);
});

test("concurrent readers share a request and can each consume the response body", async () => {
  const cache = new AdminViewCache();
  const fetch = mock.method(globalThis, "fetch", async () => Response.json({ offers: ["gpu"] }));
  const [first, second] = await Promise.all([cache.request("flash-sale", "/sale"), cache.request("flash-sale", "/sale")]);
  assert.deepEqual(await first.json(), { offers: ["gpu"] });
  assert.deepEqual(await second.json(), { offers: ["gpu"] });
  assert.equal(fetch.mock.callCount(), 1);
  await cache.request("flash-sale", "/sale");
  assert.equal(fetch.mock.callCount(), 2); // revisits revalidate rather than serving a cached response
});

test("aborting one reader leaves another reader's shared request intact", async () => {
  const cache = new AdminViewCache();
  let resolve!: (value: Response) => void;
  mock.method(globalThis, "fetch", () => new Promise<Response>((done) => { resolve = done; }));
  const controller = new AbortController();
  const cancelled = cache.request("sale", "/sale", { signal: controller.signal });
  const active = cache.request("sale", "/sale");
  controller.abort();
  const rejected = assert.rejects(cancelled, { name: "AbortError" });
  resolve(Response.json({ ok: true }));
  await rejected;
  assert.deepEqual(await (await active).json(), { ok: true });
});

test("successful edits invalidate dependent views and retain current rows for local updates", async () => {
  const cache = new AdminViewCache();
  cache.set("products", ["gpu"]);
  cache.set("overview", { stock: 2 });
  cache.set("flash-sale", { price: 100 });
  mock.method(globalThis, "fetch", async () => Response.json({ ok: true }));
  await cache.request("products", "/products", { method: "PATCH" });
  assert.deepEqual(cache.get("products"), ["gpu"]);
  assert.equal(cache.get("overview"), null);
  assert.equal(cache.get("flash-sale"), null);
});

test("failed edits retain snapshots and failed reads can be retried", async () => {
  const cache = new AdminViewCache();
  cache.set("overview", { stock: 2 });
  mock.method(globalThis, "fetch", async () => new Response(null, { status: 503 }));
  await cache.request("products", "/products", { method: "PATCH" });
  assert.deepEqual(cache.get("overview"), { stock: 2 });
  mock.restoreAll();
  let fail = true;
  mock.method(globalThis, "fetch", async () => {
    if (fail) throw new Error("offline");
    return Response.json({ ok: true });
  });
  await assert.rejects(cache.request("products", "/products"), /offline/);
  fail = false;
  assert.equal((await cache.request("products", "/products")).status, 200);
});

test("a read started before an edit retries before returning stale data", async () => {
  const cache = new AdminViewCache();
  let resolve!: (value: Response) => void;
  let reads = 0;
  mock.method(globalThis, "fetch", async (_url: string, init?: RequestInit) => {
    if (init?.method === "PATCH") return Response.json({ ok: true });
    reads++;
    if (reads === 1) return new Promise<Response>((done) => { resolve = done; });
    return Response.json({ value: "new" });
  });
  const read = cache.request("overview", "/overview");
  await cache.request("products", "/products", { method: "PATCH" });
  resolve(Response.json({ value: "old" }));
  assert.deepEqual(await (await read).json(), { value: "new" });
  assert.equal(reads, 2);
});
