import "dotenv/config";
import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { adminRequestContext } from "../src/lib/admin-request-context";
import { activityDetails, withAdminActivity } from "../src/lib/admin-activity";
import { prisma } from "../src/lib/prisma";
import { SESSION_COOKIE, signAuthToken } from "../src/lib/google-auth";

Object.assign(process.env, { AUTH_SECRET: "test-session-secret-at-least-32-characters", AUTH_URL: "http://localhost:3000" });
const actor = { googleId: "admin", email: "admin@example.com", name: "Admin", disabled: false };
Object.defineProperty(prisma.shopUser, "findUnique", { configurable: true, value: async () => actor });
Object.defineProperty(prisma.adminCredential, "findUnique", { configurable: true, value: async () => ({ active: true, version: 1 }) });

test("activity metadata excludes credentials and arbitrary request fields", () => {
  assert.deepEqual(activityDetails("users", "PATCH", { action: "setCredentials", email: "target@example.com", password: "secret", passwordHash: "hash" }), { resource: "users", action: "setCredentials", target: "target@example.com" });
  assert.equal(activityDetails("catalog", "POST", { kind: "brand", name: "Brand" }).resource, "brand");
});

test("authorized mutations persist attempt before handler and finalize response status", async () => {
  const calls: string[] = [];
  Object.defineProperty(prisma.adminActivityLog, "create", { configurable: true, value: async () => { calls.push("log"); return { id: "log1" }; } });
  Object.defineProperty(prisma.adminActivityLog, "update", { configurable: true, value: async ({ data }: { data: { status: number } }) => { calls.push(String(data.status)); } });
  const token = await signAuthToken({ sub: actor.googleId, email: actor.email, name: actor.name, role: "admin" }, "session", 60);
  const request = () => new NextRequest("http://localhost:3000/api/admin/products", { method: "POST", headers: { origin: "http://localhost:3000", cookie: `${SESSION_COOKIE}=${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ name: "Product" }) });
  const handler = withAdminActivity("products", async () => { calls.push("mutation"); return Response.json({}, { status: 201 }); });
  assert.equal((await handler(request())).status, 201);
  assert.deepEqual(calls, ["log", "mutation", "201"]);
  calls.length = 0;
  Object.defineProperty(prisma.adminActivityLog, "create", { configurable: true, value: async () => { throw new Error("database unavailable"); } });
  assert.equal((await handler(request())).status, 503);
  assert.deepEqual(calls, []);
  const denied = new NextRequest("http://localhost:3000/api/admin/products", { method: "POST", headers: { origin: "https://elsewhere.example" } });
  assert.equal((await handler(denied)).status, 403);
});

test("admin logout logs the verified identity; anonymous, customer and cross-origin logout do not", async () => {
  const { DELETE: logout } = await import("../src/app/api/auth/session/route");
  const entries: unknown[] = [];
  Object.defineProperty(prisma.adminActivityLog, "create", { configurable: true, value: async ({ data }: { data: unknown }) => { entries.push(data); return { id: "auth-log" }; } });
  const token = await signAuthToken({ sub: actor.googleId, email: actor.email, name: actor.name }, "session", 60);
  const request = (cookie = token, origin = "http://localhost:3000") => new NextRequest("http://localhost:3000/api/auth/session", { method: "DELETE", headers: { origin, cookie: `${SESSION_COOKIE}=${cookie}` } });
  const response = await logout(request());
  assert.equal(response.status, 204);
  assert.equal(response.cookies.get(SESSION_COOKIE)?.value, "");
  assert.deepEqual(entries, [{ actorEmail: actor.email, actorName: actor.name, resource: "auth", action: "LOGOUT", target: actor.email, status: 204, ...adminRequestContext(new Headers()) }]);
  assert.equal((await logout(request(token, "https://elsewhere.example"))).status, 403);
  assert.equal((await logout(request("invalid"))).status, 204);
  Object.defineProperty(prisma.adminCredential, "findUnique", { configurable: true, value: async () => null });
  assert.equal((await logout(request())).status, 204);
  assert.equal(entries.length, 1);
  Object.defineProperty(prisma.adminCredential, "findUnique", { configurable: true, value: async () => ({ active: true, version: 1 }) });
  Object.defineProperty(prisma.adminActivityLog, "create", { configurable: true, value: async () => { throw new Error("unavailable"); } });
  const failed = await logout(request());
  assert.equal(failed.status, 503);
  assert.equal(failed.cookies.get(SESSION_COOKIE), undefined);
});

test("sign-in audit stores provider and verified actor without tokens or passwords", async () => {
  const { recordAdminAuth } = await import("../src/lib/admin-activity");
  const entries: unknown[] = [];
  Object.defineProperty(prisma.adminActivityLog, "create", { configurable: true, value: async ({ data }: { data: unknown }) => { entries.push(data); } });
  await recordAdminAuth(actor, "LOGIN_GOOGLE", { headers: new Headers() });
  await recordAdminAuth(actor, "LOGIN_PASSWORD", { headers: new Headers() });
  assert.deepEqual(entries, ["LOGIN_GOOGLE", "LOGIN_PASSWORD"].map((action) => ({ actorEmail: actor.email, actorName: actor.name, resource: "auth", action, target: actor.email, status: 200, ...adminRequestContext(new Headers()) })));
});
