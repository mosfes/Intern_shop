import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/google-auth";
import { sessionUser } from "@/lib/shop-users";
import { AdminPageSkeleton } from "@/components/admin/admin-skeleton";
import { AdminPanel } from "@/components/admin/admin-panel";
import { Suspense } from "react";

async function AuthorizedAdmin() {
  // Token expiration must be checked at request time, outside prerendering.
  await connection();
  const user = await sessionUser((await cookies()).get(SESSION_COOKIE)?.value);
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  if (user.role !== "admin") redirect("/profile");
  return <AdminPanel user={user} />;
}

export default function AdminPage() {
  return <Suspense fallback={<AdminPageSkeleton />}><AuthorizedAdmin /></Suspense>;
}
