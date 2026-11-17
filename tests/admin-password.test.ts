import "dotenv/config";
import assert from "node:assert/strict";
import { before, beforeEach, test } from "node:test";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";

// Isolate audit persistence in route tests.
Object.defineProperty(prisma.adminActivityLog, "create", { configurable: true, value: async () => ({ id: "test-log" }) });
Object.defineProperty(prisma.adminActivityLog, "update", { configurable: true, value: async () => ({}) });
import { hashPassword, validPassword, validUsername, verifyPassword } from "../src/lib/admin-password";
import { POST as changePassword } from "../src/app/api/auth/change-password/route";
import { POST as login } from "../src/app/api/auth/password/route";
import { GET as directory, PATCH as manage } from "../src/app/api/admin/users/route";
import { SESSION_COOKIE, readAuthToken, signAuthToken } from "../src/lib/google-auth";
import { registerGoogleUser, sessionUser } from "../src/lib/shop-users";

Object.assign(process.env, { AUTH_SECRET: "test-session-secret-at-least-32-characters", AUTH_URL: "http://localhost:3000" });
function stub(target: object, method: string, implementation: unknown) {
  Object.defineProperty(target, method, { value: implementation, configurable: true, writable: true });
}
const password = "Test-password-only-123";
const origin = "http://localhost:3000";
let initialHash: string;
let attempts = 0;
const email = "admin@example.com";
let credential: { email: string; username: string | null; passwordHash: string | null; version: number; active: boolean; mustChangePassword: boolean } | null;
type User = { googleId: string; email: string; name: string; phone: string; picture: string | null; disabled: boolean; createdAt: Date; lastLogin: Date };
let user: User | null;
before(async () => { initialHash = await hashPassword(password); });
beforeEach(() => {
  attempts = 0;
  credential = { email, username: "testadmin", passwordHash: initialHash, version: 1, active: true, mustChangePassword: false };
  user = { googleId: "google-admin", email, name: "Test Admin", phone: "", picture: null, disabled: false, createdAt: new Date(), lastLogin: new Date() };
});
stub(prisma.adminCredential, "findUnique", async ({ where }: { where: { email?: string; username?: string } }) => credential && (where.email === credential.email || where.username === credential.username) ? { ...credential } : null);
stub(prisma.adminCredential, "findMany", async () => credential?.active ? [{ ...credential }] : []);
stub(prisma.adminCredential, "upsert", async ({ create, update }: { create: NonNullable<typeof credential>; update: { username: string; passwordHash: string; mustChangePassword: boolean } }) => {
  credential = credential?.email === create.email ? { ...credential, username: update.username, passwordHash: update.passwordHash, mustChangePassword: update.mustChangePassword, active: true, version: credential.version + 1 } : { ...create, version: 1 };
  return credential;
});
stub(prisma.adminCredential, "updateMany", async ({ where, data }: { where: { email?: string; active?: boolean; version?: number; mustChangePassword?: boolean }; data: Omit<Partial<NonNullable<typeof credential>>, "version"> & { version?: { increment: number } } }) => {
  if (!credential || (where.email !== undefined && where.email !== credential.email) || (where.active !== undefined && where.active !== credential.active) || (where.version !== undefined && where.version !== credential.version) || (where.mustChangePassword !== undefined && where.mustChangePassword !== credential.mustChangePassword)) return { count: 0 };
  const { version, ...fields } = data;
  Object.assign(credential, fields);
  if (version) credential.version += version.increment;
  return { count: 1 };
});
stub(prisma.adminLoginLimit, "upsert", async () => ({ attempts: ++attempts }));
stub(prisma.adminLoginLimit, "deleteMany", async ({ where }: { where: { key?: string } }) => { if (where.key) attempts = 0; return { count: 0 }; });
stub(prisma.shopUser, "findUnique", async ({ where }: { where: { email?: string; googleId?: string } }) => user && (user.email === where.email || user.googleId === where.googleId) ? { ...user } : null);
stub(prisma.shopUser, "findMany", async () => user ? [{ ...user }] : []);
stub(prisma.shopUser, "upsert", async ({ create }: { create: Partial<User> }) => {
  if (!user) user = { ...create, phone: "", picture: null, disabled: false, createdAt: new Date(), lastLogin: new Date() } as User;
  return { ...user };
});
stub(prisma.shopUser, "update", async ({ data }: { data: Partial<User> }) => { Object.assign(user!, data); return { ...user }; });
stub(prisma, "$transaction", async (operations: Promise<unknown>[]) => Promise.all(operations));

function request(body: object, requestOrigin = origin) {
  return new NextRequest(`${origin}/api/auth/password`, { method: "POST", headers: { origin: requestOrigin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
async function adminRequest(body?: object) {
  const token = await signAuthToken({ sub: user!.googleId, email, name: user!.name }, "session", 60);
  return new NextRequest(`${origin}/api/admin/users`, { method: body ? "PATCH" : "GET", headers: { origin, cookie: `${SESSION_COOKIE}=${token}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
}

test("passwords use unique salts, validate limits, and reject wrong passwords", async () => {
  const second = await hashPassword(password);
  assert.notEqual(second, initialHash);
  assert.ok(await verifyPassword(password, initialHash));
  assert.equal(await verifyPassword("wrong-password", initialHash), false);
  assert.equal(await verifyPassword(password), false);
  assert.equal(validPassword("short"), false);
  assert.equal(validPassword("a".repeat(129)), false);
  assert.ok(validUsername("test.admin-1"));
  assert.equal(validUsername("test@example.com"), false);
});

test("password sign-in uses an HttpOnly session and needs no Google OAuth credentials", async () => {
  const previousId = process.env.GOOGLE_CLIENT_ID;
  const previousSecret = process.env.GOOGLE_CLIENT_SECRET;
  delete process.env.GOOGLE_CLIENT_ID; delete process.env.GOOGLE_CLIENT_SECRET;
  try {
    const response = await login(request({ username: "TESTADMIN", password }));
    assert.equal(response.status, 200);
    const token = response.cookies.get(SESSION_COOKIE)!.value;
    assert.match(response.headers.get("set-cookie")!, /HttpOnly/);
    assert.equal((await readAuthToken(token, "session")).authMethod, "password");
    assert.equal((await sessionUser(token))?.role, "admin");
    assert.equal(response.headers.get("cache-control"), "no-store");
  } finally {
    if (previousId !== undefined) process.env.GOOGLE_CLIENT_ID = previousId;
    if (previousSecret !== undefined) process.env.GOOGLE_CLIENT_SECRET = previousSecret;
  }
});

test("wrong password, unknown username, removed membership, disabled account and cross-origin login fail", async () => {
  assert.equal((await login(request({ username: "testadmin", password }, "https://other.example"))).status, 403);
  assert.equal((await login(request({ username: "unknown", password }))).status, 401);
  assert.equal((await login(request({ username: "testadmin", password: "wrong-password" }))).status, 401);
  credential!.active = false;
  assert.equal((await login(request({ username: "testadmin", password }))).status, 401);
  credential!.active = true; user!.disabled = true;
  assert.equal((await login(request({ username: "testadmin", password }))).status, 401);
});

test("repeated failed logins are throttled and do not create sessions", async () => {
  for (let i = 0; i < 10; i++) assert.equal((await login(request({ username: "testadmin", password: "wrong-password" }))).status, 401);
  const response = await login(request({ username: "testadmin", password }));
  assert.equal(response.status, 429);
  assert.ok(response.headers.get("retry-after"));
  assert.equal(response.cookies.get(SESSION_COOKIE), undefined);
});

test("password resets and role revocation invalidate existing password sessions", async () => {
  const response = await login(request({ username: "testadmin", password }));
  const token = response.cookies.get(SESSION_COOKIE)!.value;
  assert.equal((await manage(await adminRequest({ action: "setCredentials", email, username: "newadmin", password: "A-new-password-123" }))).status, 200);
  assert.equal(await sessionUser(token), null);
  const next = await login(request({ username: "newadmin", password: "A-new-password-123" }));
  assert.equal(next.status, 200);
  assert.equal((await manage(await adminRequest({ action: "removeAdmin", email }))).status, 200);
  assert.equal(await sessionUser(next.cookies.get(SESSION_COOKIE)!.value), null);
  assert.equal((await login(request({ username: "newadmin", password: "A-new-password-123" }))).status, 401);
  credential!.active = true;
  assert.equal(await sessionUser(next.cookies.get(SESSION_COOKIE)!.value), null);
});

test("directory exposes usernames, never password hashes; weak credentials and customer targets fail", async () => {
  const result = await (await directory(await adminRequest())).json();
  assert.deepEqual(result.credentials, [{ email, username: "testadmin" }]);
  assert.equal(JSON.stringify(result).includes(initialHash), false);
  assert.equal((await manage(await adminRequest({ action: "setCredentials", email, username: "ab", password: "short" }))).status, 400);
  assert.equal((await manage(await adminRequest({ action: "setCredentials", email: "customer@example.com", username: "newadmin", password }))).status, 400);
});

test("pre-added admin can sign in before Google login; Google identity links to the same account", async () => {
  user = null;
  const response = await login(request({ username: "testadmin", password, remember: false }));
  assert.equal(response.status, 200);
  const local = user as User | null;
  assert.ok(local?.googleId.startsWith("local:"));
  assert.doesNotMatch(response.headers.get("set-cookie")!, /Max-Age/);
  await registerGoogleUser({ sub: "linked-google-id", email, name: "Google Name" });
  assert.equal((user as User | null)?.googleId, "linked-google-id");
  assert.equal((await login(request({ username: "testadmin", password }))).status, 200);
});

test("adding an admin can atomically provision username and password", async () => {
  const response = await manage(await adminRequest({ action: "addAdmin", email: "new@example.com", username: "new-admin", password }));
  assert.equal(response.status, 200);
  assert.equal(credential?.email, "new@example.com");
  assert.equal(credential?.active, true);
  assert.equal(credential?.username, "new-admin");
  assert.ok(await verifyPassword(password, credential?.passwordHash ?? undefined));
});

test("migrated Google-only administrators keep their role without a username or password", async () => {
  credential!.username = null; credential!.passwordHash = null;
  const token = await signAuthToken({ sub: user!.googleId, email, name: user!.name }, "session", 60);
  assert.equal((await sessionUser(token))?.role, "admin");
  assert.equal((await login(request({ username: "testadmin", password }))).status, 401);
  const response = await manage(await adminRequest({ action: "setCredentials", email, username: "configured-admin", password }));
  assert.equal(response.status, 200);
  assert.equal((await login(request({ username: "configured-admin", password }))).status, 200);
});

function changeRequest(token: string, body: unknown, requestOrigin = origin) {
  return new NextRequest(`${origin}/api/auth/change-password`, { method: "POST", headers: { origin: requestOrigin, cookie: `${SESSION_COOKIE}=${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

test("reset passwords restrict admin access until changed, then invalidate the temporary session", async () => {
  await manage(await adminRequest({ action: "setCredentials", email, username: "testadmin", password }));
  assert.equal(credential!.mustChangePassword, true);
  const response = await login(request({ username: "testadmin", password, remember: false }));
  assert.equal((await response.json()).mustChangePassword, true);
  const token = response.cookies.get(SESSION_COOKIE)!.value;
  assert.equal((await sessionUser(token))?.mustChangePassword, true);
  const restricted = new NextRequest(`${origin}/api/admin/users`, { headers: { cookie: `${SESSION_COOKIE}=${token}` } });
  assert.equal((await directory(restricted)).status, 403);
  assert.equal((await manage(new NextRequest(`${origin}/api/admin/users`, { method: "PATCH", headers: { origin, cookie: `${SESSION_COOKIE}=${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: "removeAdmin", email }) }))).status, 403);
  const nextPassword = "My-personal-new-password";
  assert.equal((await changePassword(changeRequest(token, { password: "short", confirm: "short" }))).status, 400);
  assert.equal((await changePassword(changeRequest(token, { password: nextPassword, confirm: "mismatch" }))).status, 400);
  assert.equal((await changePassword(changeRequest(token, { password, confirm: password }))).status, 400);
  assert.equal((await changePassword(changeRequest(token, { password: nextPassword, confirm: nextPassword }, "https://other.example"))).status, 403);
  assert.equal(credential!.mustChangePassword, true);
  const changed = await changePassword(changeRequest(token, { password: nextPassword, confirm: nextPassword }));
  assert.equal(changed.status, 200);
  assert.doesNotMatch(changed.headers.get("set-cookie")!, /Max-Age/);
  assert.equal(credential!.mustChangePassword, false);
  assert.equal(await sessionUser(token), null);
  assert.equal((await sessionUser(changed.cookies.get(SESSION_COOKIE)!.value))?.mustChangePassword, false);
  assert.equal((await login(request({ username: "testadmin", password }))).status, 401);
  const subsequent = await login(request({ username: "testadmin", password: nextPassword }));
  assert.equal(subsequent.status, 200);
  assert.equal((await subsequent.json()).mustChangePassword, false);
});

test("newly provisioned credentials require a password change; Google login stays independent", async () => {
  await manage(await adminRequest({ action: "addAdmin", email, username: "testadmin", password }));
  assert.equal(credential!.mustChangePassword, true);
  const google = await signAuthToken({ sub: user!.googleId, email, name: user!.name }, "session", 60);
  assert.equal((await sessionUser(google))?.mustChangePassword, false);
  assert.equal((await changePassword(changeRequest(google, { password: "Another-password-123", confirm: "Another-password-123" }))).status, 403);
  assert.equal((await changePassword(changeRequest("invalid", {}))).status, 401);
});
