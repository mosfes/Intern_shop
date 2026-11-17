import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/google-auth";
import { sessionUser } from "@/lib/shop-users";
import { ChangePasswordForm } from "@/components/account/change-password-form";

export const metadata: Metadata = { title: "เปลี่ยนรหัสผ่านครั้งแรก" };

async function ChangePasswordContent() {
  // Token expiration must be checked at request time, outside prerendering.
  await connection();
  const user = await sessionUser((await cookies()).get(SESSION_COOKIE)?.value);
  if (!user) redirect("/login");
  if (!user.mustChangePassword) redirect(user.role === "admin" ? "/admin" : "/profile");
  return <ChangePasswordForm />;
}

export default function Page() {
  return <Suspense fallback={<p role="status" className="p-8 text-center text-muted">กำลังตรวจสอบบัญชี…</p>}><ChangePasswordContent /></Suspense>;
}
