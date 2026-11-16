import type { Metadata } from "next";
import { RegisterForm } from "@/components/account/auth-forms";

export const metadata: Metadata = { title: "สมัครสมาชิก" };

export default function Page() {
  return <RegisterForm />;
}
