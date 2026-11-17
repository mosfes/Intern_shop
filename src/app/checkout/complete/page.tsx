import type { Metadata } from "next";
import { PaymentStatus } from "@/components/checkout/payment-status";
import { Container } from "@/components/ui/section";

export const metadata: Metadata = { title: "สถานะการชำระเงิน" };

export default function CheckoutCompletePage() {
  return (
    <Container className="pb-16 pt-8">
      <PaymentStatus />
    </Container>
  );
}
