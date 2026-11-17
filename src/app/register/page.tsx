import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/account/auth-forms";
import { REGISTRATION_OPEN } from "@/lib/registration";

export const metadata: Metadata = { title: "สมัครสมาชิก" };

export default function Page() {
  if (!REGISTRATION_OPEN) redirect("/login");
  return <RegisterForm />;
}
