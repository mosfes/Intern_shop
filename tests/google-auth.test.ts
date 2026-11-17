import "dotenv/config";
import assert from "node:assert/strict";
import { test, mock } from "node:test";
import { prisma } from "../src/lib/prisma";
import { OAuth2Client } from "google-auth-library";
import { NextRequest } from "next/server";
import { GET as startLogin } from "../src/app/api/auth/google/route";
import { GET as callback } from "../src/app/api/auth/google/callback/route";
import { GET as session, DELETE as logout } from "../src/app/api/auth/session/route";
import { FLOW_COOKIE, SESSION_COOKIE, readAuthToken, signAuthToken } from "../src/lib/google-auth";

Object.assign(process.env, {
  GOOGLE_CLIENT_ID: "test-client", GOOGLE_CLIENT_SECRET: "test-client-secret",
  AUTH_SECRET: "test-session-secret-at-least-32-characters", AUTH_URL: "http://localhost:3000",
});

function stub(target: object, method: string, implementation: unknown) {
  Object.defineProperty(target, method, { value: implementation, configurable: true, writable: true });
}
const origin = "http://localhost:3000";

const googleUser = { googleId: "google-user-123", name: "Google User", email: "google@example.com", phone: "", picture: "https://lh3.googleusercontent.com/example", disabled: false, createdAt: new Date(), lastLogin: new Date() };
stub(prisma.shopUser, "upsert", async () => googleUser);
stub(prisma.shopUser, "findUnique", async () => googleUser);
stub(prisma.adminCredential, "findUnique", async () => null);
function request(path: string, cookie?: string) {
  return new NextRequest(`${origin}${path}`, { headers: cookie ? { cookie } : undefined });
}

test("Google login requests basic profile and binds the redirect to a short-lived flow", async () => {
  const response = await startLogin(request("/api/auth/google"));
  const location = new URL(response.headers.get("location")!);
  assert.equal(location.origin, "https://accounts.google.com");
  assert.equal(location.searchParams.get("redirect_uri"), `${origin}/api/auth/google/callback`);
  assert.equal(location.searchParams.get("scope"), "openid email profile");
  assert.equal(location.searchParams.get("code_challenge_method"), "S256");
  const cookie = response.cookies.get(FLOW_COOKIE)!;
  const flow = await readAuthToken(cookie.value, "flow");
  assert.equal(flow.state, location.searchParams.get("state"));
  assert.equal(flow.nonce, location.searchParams.get("nonce"));
  assert.ok(flow.codeVerifier);
  assert.match(response.headers.get("set-cookie")!, /HttpOnly/i);
});

test("new Google identity enters directly without registration; session and logout work", async () => {
  const tokenMock = mock.method(OAuth2Client.prototype, "getToken", async () => ({ tokens: { id_token: "verified-by-library" } }));
  const identityMock = mock.method(OAuth2Client.prototype, "verifyIdToken", async () => ({
    getPayload: () => ({ sub: "google-user-123", name: "Google User", email: "google@example.com", email_verified: true, nonce: "nonce", picture: "https://lh3.googleusercontent.com/example" }),
  }));
  try {
    const flow = await signAuthToken({ state: "state", nonce: "nonce", codeVerifier: "verifier" }, "flow", 600);
    const response = await callback(request("/api/auth/google/callback?code=code&state=state", `${FLOW_COOKIE}=${flow}`));
    assert.equal(response.headers.get("location"), `${origin}/auth/complete`);
    const cookie = response.cookies.get(SESSION_COOKIE)!;
    assert.ok(cookie);
    assert.equal(response.cookies.get(FLOW_COOKIE)?.value, "");
    const profile = await session(request("/api/auth/session", `${SESSION_COOKIE}=${cookie.value}`));
    assert.deepEqual(await profile.json(), { user: { googleId: "google-user-123", name: "Google User", email: "google@example.com", picture: "https://lh3.googleusercontent.com/example", phone: "", role: "customer", mustChangePassword: false } });
    assert.equal(profile.headers.get("cache-control"), "no-store");
    const signedOut = await logout(new NextRequest(`${origin}/api/auth/session`, { method: "DELETE", headers: { origin } }));
    assert.equal(signedOut.status, 204);
    assert.equal(signedOut.cookies.get(SESSION_COOKIE)?.value, "");
    assert.equal(tokenMock.mock.callCount(), 1);
  } finally { tokenMock.mock.restore(); identityMock.mock.restore(); }
});

test("callback rejects incorrect state and cancellation without creating a session", async () => {
  const flow = await signAuthToken({ state: "expected", nonce: "nonce", codeVerifier: "verifier" }, "flow", 600);
  for (const query of ["code=code&state=wrong", "error=access_denied&state=expected"]) {
    const response = await callback(request(`/api/auth/google/callback?${query}`, `${FLOW_COOKIE}=${flow}`));
    assert.equal(response.headers.get("location"), `${origin}/login?error=google_login`);
    assert.equal(response.cookies.get(SESSION_COOKIE), undefined);
    assert.equal(response.cookies.get(FLOW_COOKIE)?.value, "");
  }
});

test("callback rejects an unverified email or mismatched nonce", async () => {
  const tokenMock = mock.method(OAuth2Client.prototype, "getToken", async () => ({ tokens: { id_token: "token" } }));
  try {
    for (const claims of [{ email_verified: false, nonce: "nonce" }, { email_verified: true, nonce: "wrong" }]) {
      const identityMock = mock.method(OAuth2Client.prototype, "verifyIdToken", async () => ({
        getPayload: () => ({ sub: "user", email: "google@example.com", ...claims }),
      }));
      try {
        const flow = await signAuthToken({ state: "state", nonce: "nonce", codeVerifier: "verifier" }, "flow", 600);
        const response = await callback(request("/api/auth/google/callback?code=code&state=state", `${FLOW_COOKIE}=${flow}`));
        assert.equal(response.cookies.get(SESSION_COOKIE), undefined);
        assert.equal(response.headers.get("location"), `${origin}/login?error=google_login`);
      } finally { identityMock.mock.restore(); }
    }
  } finally { tokenMock.mock.restore(); }
});

test("session rejects tampered, expired, and wrong-purpose tokens", async () => {
  const claims = { sub: "user", email: "google@example.com", name: "User" };
  const valid = await signAuthToken(claims, "session", 60);
  const tokens = [
    `${valid.split(".")[0]}.${Buffer.from(JSON.stringify({ ...claims, sub: "attacker" })).toString("base64url")}.${valid.split(".")[2]}`,
    await signAuthToken(claims, "session", -10),
    await signAuthToken(claims, "flow", 60),
  ];
  for (const token of tokens) {
    const response = await session(request("/api/auth/session", `${SESSION_COOKIE}=${token}`));
    assert.deepEqual(await response.json(), { user: null });
  }
});

test("logout rejects cross-origin requests", async () => {
  const response = await logout(new NextRequest(`${origin}/api/auth/session`, { method: "DELETE", headers: { origin: "https://other.example" } }));
  assert.equal(response.status, 403);
});
