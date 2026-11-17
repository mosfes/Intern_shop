import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";
import { Container, PageHeader } from "@/components/ui/section";
import { CatalogProducts } from "@/components/catalog-products";

export const metadata: Metadata = { title: "ตะกร้าสินค้า" };

export default function CartPage() {
  return (
    <Container className="pt-8">
      <PageHeader title="ตะกร้าสินค้า" description="ตรวจสอบรายการสินค้าก่อนดำเนินการชำระเงิน" />
      <CatalogProducts><CartView /></CatalogProducts>
    </Container>
  );
}
