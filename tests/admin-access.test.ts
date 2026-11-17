import "dotenv/config";
import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";
import { GET, PATCH } from "../src/app/api/admin/users/route";
import { GET as getSession } from "../src/app/api/auth/session/route";
import { registerGoogleUser } from "../src/lib/shop-users";
import { SESSION_COOKIE, signAuthToken } from "../src/lib/google-auth";

Object.assign(process.env, { GOOGLE_CLIENT_ID: "test", GOOGLE_CLIENT_SECRET: "test", AUTH_SECRET: "test-session-secret-at-least-32-characters", AUTH_URL: "http://localhost:3000" });
function stub(target: object, method: string, implementation: unknown) {
  Object.defineProperty(target, method, { value: implementation, configurable: true, writable: true });
}
const admins = new Set(["mosfes3@gmail.com"]);
const users = [
  { googleId: "admin", email: "mosfes3@gmail.com", name: "Admin", phone: "", picture: null, disabled: false, createdAt: new Date(), lastLogin: new Date() },
  { googleId: "customer", email: "customer@gmail.com", name: "Customer", phone: "", picture: null, disabled: false, createdAt: new Date(), lastLogin: new Date() },
];
stub(prisma.adminCredential, "findUnique", async ({ where }: { where: { email: string } }) => admins.has(where.email) ? { email: where.email, active: true, username: null, passwordHash: null, version: 1 } : null);
stub(prisma.adminCredential, "findMany", async () => [...admins].map((email) => ({ email, username: null })));
stub(prisma.adminCredential, "upsert", async ({ where }: { where: { email: string } }) => { admins.add(where.email); return { email: where.email }; });
stub(prisma.adminCredential, "updateMany", async ({ where }: { where: { email: string } }) => { admins.delete(where.email); return { count: 1 }; });
stub(prisma.shopUser, "findUnique", async ({ where }: { where: { email?: string; googleId?: string } }) => users.find((user) => where.email ? user.email === where.email : user.googleId === where.googleId) ?? null);
stub(prisma.shopUser, "findMany", async () => users);
stub(prisma.shopUser, "update", async ({ where, data }: { where: { googleId: string }; data: object }) => Object.assign(users.find((user) => user.googleId === where.googleId)!, data));

stub(prisma.shopUser, "upsert", async ({ where, create, update }: { where: { email: string }; create: { googleId: string; email: string; name: string; phone?: string }; update: object }) => {
  const existing = users.find((entry) => entry.email === where.email);
  if (existing) return Object.assign(existing, update);
  const created = { phone: "", picture: null, disabled: false, createdAt: new Date(), lastLogin: new Date(), ...create };
  users.push(created);
  return created;
});

stub(prisma, "$transaction", async (run: (tx: typeof prisma) => Promise<unknown>) => run(prisma));

async function request(identity?: number, body?: object, origin = "http://localhost:3000") {
  const headers: Record<string, string> = { origin, "Content-Type": "application/json" };
  if (identity !== undefined) {
    const user = users[identity];
    // A signed role claim also cannot override the current database allowlist.
    const token = await signAuthToken({ sub: user.googleId, email: user.email, name: user.name, role: "admin" }, "session", 60);
    headers.cookie = `${SESSION_COOKIE}=${token}`;
  }
  return new NextRequest("http://localhost:3000/api/admin/users", { headers, method: body ? "PATCH" : "GET", body: body ? JSON.stringify(body) : undefined });
}

test("admin directory requires a verified session and database admin membership", async () => {
  assert.equal((await GET(await request())).status, 401);
  assert.equal((await GET(await request(1))).status, 403);
  const response = await GET(await request(0));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(result.admins, ["mosfes3@gmail.com"]);
  assert.equal(result.users[1].role, "customer");
});

test("customer and cross-origin mutations are rejected", async () => {
  assert.equal((await PATCH(await request(1, { action: "addAdmin", email: "customer@gmail.com" }))).status, 403);
  assert.equal((await PATCH(await request(0, { action: "addAdmin", email: "bad@gmail.com" }, "https://other.example"))).status, 403);
  assert.equal((await PATCH(await request(0, { action: "addAdmin", email: "invalid" }))).status, 400);
});

test("admin can edit and suspend a customer; suspension invalidates existing session", async () => {
  assert.equal((await PATCH(await request(0, { action: "updateCustomer", googleId: "customer", name: "Updated", phone: "0812345678", disabled: true }))).status, 200);
  assert.equal(users[1].name, "Updated");
  assert.deepEqual(await (await getSession(await request(1))).json(), { user: null });
  assert.equal((await PATCH(await request(0, { action: "addAdmin", email: users[1].email }))).status, 400);
  assert.equal((await PATCH(await request(0, { action: "updateCustomer", googleId: "customer", name: "Updated", phone: "", disabled: false }))).status, 200);
});

test("allowlist accepts emails before login and changes take effect for existing sessions", async () => {
  assert.equal((await PATCH(await request(0, { action: "addAdmin", email: " Future@Gmail.com " }))).status, 200);
  assert.ok(admins.has("future@gmail.com"));
  assert.equal((await PATCH(await request(0, { action: "addAdmin", email: users[1].email }))).status, 200);
  assert.equal((await GET(await request(1))).status, 200);
  assert.equal((await PATCH(await request(0, { action: "removeAdmin", email: users[1].email }))).status, 200);
  assert.equal((await GET(await request(1))).status, 403);
});

test("profile editor saves details and permissions together while preserving Google photo", async () => {
  const profile = { action: "updateUser", email: users[1].email, name: "Updated Customer", phone: "0812345678", disabled: false, role: "admin" };
  assert.equal((await PATCH(await request(0, profile))).status, 200);
  assert.equal(users[1].name, "Updated Customer");
  assert.equal(users[1].phone, "0812345678");
  assert.equal(users[1].picture, null);
  assert.ok(admins.has(users[1].email));
  assert.equal((await PATCH(await request(0, { ...profile, role: "customer", disabled: true }))).status, 200);
  assert.ok(!admins.has(users[1].email));
  assert.equal(users[1].disabled, true);
  assert.equal((await PATCH(await request(0, { ...profile, disabled: true }))).status, 400);
  assert.equal((await PATCH(await request(0, { ...profile, name: "" }))).status, 400);
  assert.equal((await PATCH(await request(0, { ...profile, role: "owner" }))).status, 400);
  assert.equal((await PATCH(await request(0, { ...profile, role: "customer" }))).status, 200);
});

test("profile editor updates permissions for an admin awaiting first login", async () => {
  assert.equal((await PATCH(await request(0, { action: "updateUser", email: "future@gmail.com", role: "customer", disabled: false }))).status, 200);
  assert.ok(!admins.has("future@gmail.com"));
  assert.equal((await PATCH(await request(0, { action: "updateUser", email: "unknown@gmail.com", role: "admin", disabled: false }))).status, 404);
});

test("creating an admin saves contact details before first login and preserves them when linking Google", async () => {
  const email = "profile-admin@example.com";
  const profile = { action: "addAdmin", email, name: "  สมชาย ใจดี  ", phone: " 0812345678 ", username: "profile-admin", password: "New-admin-password-123" };
  assert.equal((await PATCH(await request(0, { ...profile, name: " " }))).status, 400);
  assert.equal((await PATCH(await request(0, { ...profile, phone: "1".repeat(31) }))).status, 400);
  assert.equal((await PATCH(await request(0, profile))).status, 200);
  const created = users.find((entry) => entry.email === email)!;
  assert.equal(created.name, "สมชาย ใจดี");
  assert.equal(created.phone, "0812345678");
  assert.ok(created.googleId.startsWith("local:"));
  assert.ok(admins.has(email));
  const directory = await (await GET(await request(0))).json();
  assert.equal(directory.users.find((entry: { email: string }) => entry.email === email).name, "สมชาย ใจดี");
  await registerGoogleUser({ sub: "profile-google-id", email, name: "Google Name" });
  assert.equal(created.googleId, "profile-google-id");
  assert.equal(created.name, "สมชาย ใจดี");
  assert.equal(created.phone, "0812345678");
});

test("adding profile details to an existing account preserves its Google identity", async () => {
  assert.equal((await PATCH(await request(0, { action: "addAdmin", email: users[1].email, name: "Customer Admin", phone: "0898765432" }))).status, 200);
  assert.equal(users[1].googleId, "customer");
  assert.equal(users[1].name, "Customer Admin");
  assert.equal(users[1].phone, "0898765432");
});

test("account status supports creating a disabled admin and enabling it later", async () => {
  const email = "disabled-admin@example.com";
  const profile = { action: "addAdmin", email, name: "Disabled Admin", phone: "", disabled: true };
  assert.equal((await PATCH(await request(0, { ...profile, disabled: "off" }))).status, 400);
  assert.equal((await PATCH(await request(0, profile))).status, 200);
  const created = users.find((entry) => entry.email === email)!;
  assert.equal(created.disabled, true);
  assert.ok(admins.has(email));
  const index = users.indexOf(created);
  assert.deepEqual(await (await getSession(await request(index))).json(), { user: null });
  assert.equal((await PATCH(await request(0, { ...profile, action: "updateUser", role: "admin", disabled: false }))).status, 200);
  assert.equal(created.disabled, false);
  assert.equal((await (await getSession(await request(index))).json()).user.role, "admin");
});

test("mosfes3 can lose admin rights, including by self removal, without automatic restoration", async () => {
  assert.equal((await PATCH(await request(0, { action: "removeAdmin", email: "mosfes3@gmail.com" }))).status, 200);
  assert.equal((await GET(await request(0))).status, 403);
  const { user } = await (await getSession(await request(0))).json();
  assert.equal(user.role, "customer");
  assert.ok(!admins.has("mosfes3@gmail.com"));
});
