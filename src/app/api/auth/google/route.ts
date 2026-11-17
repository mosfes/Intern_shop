import { randomBytes } from "node:crypto";
import { CodeChallengeMethod } from "google-auth-library";
import { NextResponse } from "next/server";
import { cookieOptions, FLOW_COOKIE, googleConfig, signAuthToken } from "@/lib/google-auth";

export async function GET(request: Request) {
  try {
    const { client } = googleConfig();
    const state = randomBytes(32).toString("base64url");
    const nonce = randomBytes(32).toString("base64url");
    const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();
    const response = NextResponse.redirect(client.generateAuthUrl({
      scope: ["openid", "email", "profile"],
      state, nonce, prompt: "select_account",
      code_challenge: codeChallenge,
      code_challenge_method: CodeChallengeMethod.S256,
    }));
    response.cookies.set(FLOW_COOKIE, await signAuthToken({ state, nonce, codeVerifier }, "flow", 600), { ...cookieOptions, maxAge: 600 });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?error=google_configuration", request.url));
  }
}
