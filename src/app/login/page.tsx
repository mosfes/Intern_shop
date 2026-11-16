import type { Metadata } from "next";
import { LoginForm } from "@/components/account/auth-forms";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

export default function Page() {
  return <LoginForm />;
}
