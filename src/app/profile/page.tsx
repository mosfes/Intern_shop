import type { Metadata } from "next";
import { ProfileView } from "@/components/account/account-views";
import { Container, PageHeader } from "@/components/ui/section";

export const metadata: Metadata = { title: "โปรไฟล์ของฉัน" };

export default function Page() {
  return (
    <Container className="pt-8">
      <PageHeader title="โปรไฟล์ของฉัน" description="จัดการข้อมูลบัญชีของคุณ" />
      <ProfileView />
    </Container>
  );
}
