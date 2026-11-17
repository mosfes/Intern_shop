import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/account/auth-forms";
import { safeNextPath } from "@/lib/auth-redirect";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

type LoginSearchParams = Promise<{ error?: string; next?: string; registered?: string }>;

async function LoginContent({ searchParams }: { searchParams: LoginSearchParams }) {
  const { error, next, registered } = await searchParams;
  return <LoginForm googleError={error} next={safeNextPath(next) ?? undefined} registered={registered === "1"} />;
}

export default function Page({ searchParams }: { searchParams: LoginSearchParams }) {
  return (
    <Suspense fallback={<LoginForm />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}
