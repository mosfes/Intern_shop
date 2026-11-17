import { sessionUser } from "@/lib/shop-users";
import { type NextRequest, NextResponse } from "next/server";
import { cookieOptions, authConfig, SESSION_COOKIE } from "@/lib/google-auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  try {
    const user = await sessionUser(token);
    const response = NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
    if (token && !user) response.cookies.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
    return response;
  } catch {
    return NextResponse.json({ error: "Session unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export async function DELETE(request: NextRequest) {
  let origin = request.nextUrl.origin;
  try { origin = authConfig().origin; } catch { /* Logout also works before authentication configuration. */ }
  if (request.headers.get("origin") !== origin) return new NextResponse(null, { status: 403 });
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return response;
}
