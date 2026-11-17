import type { Metadata } from "next";
import { OrdersView } from "@/components/account/account-views";
import { Container, PageHeader } from "@/components/ui/section";
import { CatalogProducts } from "@/components/catalog-products";

export const metadata: Metadata = { title: "คำสั่งซื้อของฉัน" };

export default function Page() {
  return (
    <Container className="pt-8">
      <PageHeader title="คำสั่งซื้อของฉัน" description="ติดตามสถานะและเลือกคำสั่งซื้อเพื่อดูรายละเอียด" />
      <CatalogProducts><OrdersView /></CatalogProducts>
    </Container>
  );
}
