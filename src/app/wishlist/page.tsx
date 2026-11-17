import type { Metadata } from "next";
import { WishlistView } from "@/components/account/account-views";
import { Container, PageHeader } from "@/components/ui/section";
import { CatalogProducts } from "@/components/catalog-products";

export const metadata: Metadata = { title: "รายการโปรด" };

export default function Page() {
  return (
    <Container className="pt-8">
      <PageHeader title="รายการโปรด" description="สินค้าที่คุณบันทึกไว้" />
      <CatalogProducts><WishlistView /></CatalogProducts>
    </Container>
  );
}
