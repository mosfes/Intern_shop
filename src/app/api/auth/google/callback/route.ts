import { registerGoogleUser } from "@/lib/shop-users";
import { type NextRequest, NextResponse } from "next/server";
import { cookieOptions, FLOW_COOKIE, googleConfig, readAuthToken, SESSION_AGE, SESSION_COOKIE, signAuthToken } from "@/lib/google-auth";

export async function GET(request: NextRequest) {
  let response: NextResponse;
  try {
    const { client, clientId, origin } = googleConfig();
    const flowCookie = request.cookies.get(FLOW_COOKIE)?.value;
    if (!flowCookie) throw new Error("Missing login flow");
    const flow = await readAuthToken(flowCookie, "flow");
    const code = request.nextUrl.searchParams.get("code");
    if (!code || request.nextUrl.searchParams.get("state") !== flow.state || typeof flow.codeVerifier !== "string") {
      throw new Error("Invalid login flow");
    }
    const { tokens } = await client.getToken({ code, codeVerifier: flow.codeVerifier });
    if (!tokens.id_token) throw new Error("Missing Google identity");
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: clientId });
    const profile = ticket.getPayload();
    if (!profile?.sub || !profile.email || !profile.email_verified || profile.nonce !== flow.nonce) {
      throw new Error("Invalid Google identity");
    }
    await registerGoogleUser({ sub: profile.sub, email: profile.email, name: profile.name, picture: profile.picture });
    // Google is the identity provider; first-time users enter directly without a registration form.
    const session = await signAuthToken({ sub: profile.sub, email: profile.email, name: profile.name || profile.email.split("@")[0], picture: profile.picture ?? null }, "session", SESSION_AGE);
    response = NextResponse.redirect(new URL("/auth/complete", origin));
    response.cookies.set(SESSION_COOKIE, session, { ...cookieOptions, maxAge: SESSION_AGE });
  } catch {
    response = NextResponse.redirect(new URL("/login?error=google_login", request.url));
  }
  response.cookies.set(FLOW_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
