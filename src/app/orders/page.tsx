import type { Metadata } from "next";
import { OrdersView } from "@/components/account/account-views";
import { Container, PageHeader } from "@/components/ui/section";

export const metadata: Metadata = { title: "คำสั่งซื้อของฉัน" };

export default function Page() {
  return (
    <Container className="pt-8">
      <PageHeader title="คำสั่งซื้อของฉัน" description="ติดตามสถานะคำสั่งซื้อ (ข้อมูลเดโมในเบราว์เซอร์)" />
      <OrdersView />
    </Container>
  );
}
