import assert from "node:assert/strict";
import { test } from "node:test";
import { adminRequestContext } from "../src/lib/admin-request-context";
import { adminDevice } from "../src/lib/admin-device";

test("request metadata trusts only configured infrastructure and validates IPs", () => {
  const previous = process.env.ADMIN_LOG_PROXY;
  try {
    const headers = new Headers({ "x-vercel-forwarded-for": "203.0.113.5", "x-forwarded-for": "1.1.1.1", "x-vercel-ip-city": "Bang%20Kapi", "x-vercel-ip-country": "TH", "x-vercel-ip-country-region": "10", "user-agent": "Mozilla/5.0 (iPhone) Version/17.0 Mobile Safari/604.1" });
    process.env.ADMIN_LOG_PROXY = "none";
    assert.equal(adminRequestContext(headers).ipAddress, null);
    assert.equal(adminRequestContext(headers).city, null);
    process.env.ADMIN_LOG_PROXY = "vercel";
    assert.deepEqual(adminRequestContext(headers), { ipAddress: "203.0.113.5", city: "Bang Kapi", country: "TH", region: "10", contextSource: "vercel", userAgent: headers.get("user-agent") });
    headers.set("x-vercel-forwarded-for", "malformed");
    assert.equal(adminRequestContext(headers).ipAddress, null);
    process.env.ADMIN_LOG_PROXY = "cloudflare";
    headers.set("cf-connecting-ip", "2001:db8::1"); headers.set("cf-ipcountry", "XX"); headers.set("cf-ipcity", "Bangkok"); headers.set("cf-region", "Bangkok");
    assert.equal(adminRequestContext(headers).ipAddress, "2001:db8::1");
    assert.equal(adminRequestContext(headers).country, null);
    assert.equal(adminRequestContext(headers).city, "Bangkok");
    process.env.ADMIN_LOG_PROXY = "proxy";
    assert.equal(adminRequestContext(headers).ipAddress, null);
    headers.set("x-real-ip", "192.0.2.1");
    assert.equal(adminRequestContext(headers).ipAddress, "192.0.2.1");
    assert.equal(adminRequestContext(headers).city, null);
    headers.set("user-agent", "x".repeat(1200));
    assert.equal(adminRequestContext(headers).userAgent?.length, 1000);
    assert.equal(adminRequestContext(new Headers()).userAgent, null);
  } finally { if (previous === undefined) delete process.env.ADMIN_LOG_PROXY; else process.env.ADMIN_LOG_PROXY = previous; }
});

test("device summary distinguishes common browsers and mobile platforms", () => {
  assert.match(adminDevice("Mozilla/5.0 (Windows NT 10.0) Chrome/130 Safari/537 Edg/130")!, /Edge.*Windows/);
  assert.match(adminDevice("Mozilla/5.0 (iPhone) Mobile Safari/604.1")!, /Safari.*iOS.*มือถือ/);
  assert.match(adminDevice("Mozilla/5.0 (Linux; Android 14) Chrome/130 Safari/537")!, /Chrome.*Android.*แท็บเล็ต/);
  assert.equal(adminDevice(null), null);
});
