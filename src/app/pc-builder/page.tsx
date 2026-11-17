import type { Metadata } from "next";
import { PcBuilder } from "@/components/pc-builder/pc-builder";
import { Container, PageHeader } from "@/components/ui/section";

export const metadata: Metadata = { title: "จัดสเปคคอม" };

export default function PcBuilderPage() {
  return (
    <Container className="py-8 sm:py-12">
      <PageHeader title="จัดสเปคคอมในแบบคุณ" description="เลือกอุปกรณ์ทีละชิ้น เช็กราคาและความเข้ากันได้ แล้วสั่งซื้อทั้งชุดได้ในที่เดียว" />
      <PcBuilder />
    </Container>
  );
}
