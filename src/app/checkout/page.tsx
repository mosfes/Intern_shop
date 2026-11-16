import type { Metadata } from "next";
import { CheckoutView } from "@/components/checkout/checkout-view";
import { Container, PageHeader } from "@/components/ui/section";

export const metadata: Metadata = { title: "ชำระเงิน" };

export default function CheckoutPage() {
  return (
    <Container className="pt-8">
      <PageHeader title="ชำระเงิน" description="กรอกข้อมูลการจัดส่งและเลือกวิธีชำระเงิน (ระบบสาธิต)" />
      <CheckoutView />
    </Container>
  );
}
