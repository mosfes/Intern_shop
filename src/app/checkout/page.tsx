import type { Metadata } from "next";
import { CheckoutView } from "@/components/checkout/checkout-view";
import { Container, PageHeader } from "@/components/ui/section";
import { CatalogProducts } from "@/components/catalog-products";

export const metadata: Metadata = { title: "ชำระเงิน" };

// The public key is safe for browsers; accept it under either name in .env.
const omisePublicKey = process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY ?? process.env.OMISE_PUBLIC_KEY ?? "";

export default function CheckoutPage() {
  return (
    <Container className="pt-8">
      <PageHeader title="ชำระเงิน" description="กรอกข้อมูลการจัดส่งและเลือกวิธีชำระเงิน" />
      <CatalogProducts><CheckoutView omisePublicKey={omisePublicKey} /></CatalogProducts>
    </Container>
  );
}
