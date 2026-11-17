import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { addressSnapshot, clearAddressBook, loadAddressBook, reloadAddressBook } from "../src/lib/address-book-cache";

const address = { id: "home", label: "บ้าน", fullName: "สมชาย", phone: "0812345678", address: "99/1", province: "กรุงเทพมหานคร", district: "บางรัก", subdistrict: "สีลม", postcode: "10500", isDefault: true };
const response = (addresses = [address]) => Response.json({ addresses });
afterEach(() => { clearAddressBook(); mock.restoreAll(); });

test("checkout reuses a preload and concurrent consumers share one request", async () => {
  let resolve!: (value: Response) => void;
  const fetch = mock.method(globalThis, "fetch", () => new Promise<Response>((done) => { resolve = done; }));
  const preload = loadAddressBook("customer-a");
  const checkout = loadAddressBook("customer-a");
  assert.equal(preload, checkout);
  await Promise.resolve();
  resolve(response());
  await preload;
  assert.deepEqual(addressSnapshot("customer-a").addresses, [address]);
  await loadAddressBook("customer-a");
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(addressSnapshot("customer-b").addresses, null);
});

test("sign-out discards in-flight personal data", async () => {
  let resolve!: (value: Response) => void;
  mock.method(globalThis, "fetch", () => new Promise<Response>((done) => { resolve = done; }));
  const preload = loadAddressBook("customer-a");
  await Promise.resolve();
  clearAddressBook();
  resolve(response());
  await preload;
  assert.equal(addressSnapshot("customer-a").addresses, null);
});

test("a mutation reload supersedes an older request", async () => {
  const pending: ((value: Response) => void)[] = [];
  mock.method(globalThis, "fetch", () => new Promise<Response>((done) => pending.push(done)));
  const preload = loadAddressBook("customer-a");
  await Promise.resolve();
  const reload = loadAddressBook("customer-a", true);
  await Promise.resolve();
  pending[1](response([]));
  await reload;
  pending[0](response());
  await preload;
  assert.deepEqual(addressSnapshot("customer-a").addresses, []);
});

test("failed loads can retry and stale cached data is refreshed", async () => {
  let now = 100_000;
  mock.method(Date, "now", () => now);
  let fail = true;
  const fetch = mock.method(globalThis, "fetch", async () => {
    if (fail) throw new Error("offline");
    return response();
  });
  await loadAddressBook("customer-a");
  assert.equal(addressSnapshot("customer-a").failed, true);
  fail = false;
  await loadAddressBook("customer-a");
  assert.equal(addressSnapshot("customer-a").failed, false);
  now += 60_001;
  await loadAddressBook("customer-a");
  assert.equal(fetch.mock.callCount(), 3);
});

test("account changes discard old responses and late mutation reloads", async () => {
  const pending: ((value: Response) => void)[] = [];
  const fetch = mock.method(globalThis, "fetch", () => new Promise<Response>((done) => pending.push(done)));
  const previous = loadAddressBook("customer-a");
  await Promise.resolve();
  const next = loadAddressBook("customer-b");
  await Promise.resolve();
  pending[1](response([]));
  await next;
  pending[0](response());
  await previous;
  await reloadAddressBook("customer-a");
  assert.equal(addressSnapshot("customer-a").addresses, null);
  assert.deepEqual(addressSnapshot("customer-b").addresses, []);
  assert.equal(fetch.mock.callCount(), 2);
});
