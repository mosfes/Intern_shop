import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/google-auth";
import { sessionUser } from "@/lib/shop-users";

/** The signed-in customer for a request. Admins don't shop, so they get null. */
export async function customerFromRequest(request: NextRequest) {
  const user = await sessionUser(request.cookies.get(SESSION_COOKIE)?.value);
  return user && user.role !== "admin" && !user.mustChangePassword ? user : null;
}
