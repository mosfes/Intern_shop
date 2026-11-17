import { OAuth2Client } from "google-auth-library";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "edm-google-session";
export const FLOW_COOKIE = "edm-google-flow";
export const SESSION_AGE = 60 * 60 * 24 * 7;

export function authConfig() {
  const { AUTH_SECRET, AUTH_URL } = process.env;
  if (!AUTH_SECRET || AUTH_SECRET.length < 32 || !AUTH_URL) {
    throw new Error("Authentication is not configured");
  }
  const origin = new URL(AUTH_URL).origin;
  if (!origin.startsWith("https://") && !(process.env.NODE_ENV !== "production" && new URL(origin).hostname === "localhost")) {
    throw new Error("AUTH_URL must use HTTPS (or localhost in development)");
  }
  return { origin, key: new TextEncoder().encode(AUTH_SECRET) };
}

export function googleConfig() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) throw new Error("Google authentication is not configured");
  const config = authConfig();
  return {
    ...config,
    client: new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, `${config.origin}/api/auth/google/callback`),
    clientId: GOOGLE_CLIENT_ID,
  };
}

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function signAuthToken(payload: Record<string, unknown>, purpose: "flow" | "session", maxAge: number) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("edm-pc-shop")
    .setAudience(purpose)
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(authConfig().key);
}

export async function readAuthToken(token: string, purpose: "flow" | "session") {
  const { payload } = await jwtVerify(token, authConfig().key, {
    algorithms: ["HS256"], issuer: "edm-pc-shop", audience: purpose,
  });
  return payload;
}
