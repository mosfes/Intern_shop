import { Breadcrumbs } from "@heroui/react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductGrid } from "@/components/product/product-card";
import { DetailTabs } from "@/components/product-detail/detail-tabs";
import { ProductGallery } from "@/components/product-detail/gallery";
import { PurchasePanel } from "@/components/product-detail/purchase-panel";
import { ProductDetailSkeleton } from "@/components/product-detail/detail-skeleton";
import { Container, SectionHeader } from "@/components/ui/section";
import { getCatalog } from "@/lib/catalog-server";

export async function generateStaticParams() {
  const { products } = await getCatalog();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = (await getCatalog()).productBySlug.get(slug);
  return product ? { title: product.name, description: product.description } : { title: "ไม่พบสินค้า" };
}

export default function ProductPage({ params }: PageProps<"/products/[slug]">) {
  return (
    <Suspense fallback={<ProductDetailSkeleton />}>
      <ProductDetail params={params} />
    </Suspense>
  );
}

async function ProductDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { productBySlug, categoryMap, getRelatedProducts } = await getCatalog();
  const product = productBySlug.get(slug);
  if (!product) notFound();
  const category = categoryMap.get(product.category);

  return (
    <Container className="pt-6">
      <Breadcrumbs className="mb-6">
        <Breadcrumbs.Item href="/">หน้าแรก</Breadcrumbs.Item>
        <Breadcrumbs.Item href={`/products?category=${product.category}`}>{category?.nameTh ?? product.category}</Breadcrumbs.Item>
        <Breadcrumbs.Item>
          <span className="line-clamp-1 max-w-[40vw]">{product.name}</span>
        </Breadcrumbs.Item>
      </Breadcrumbs>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
        <div className="lg:sticky lg:top-36 lg:self-start">
          <ProductGallery product={product} />
        </div>
        <PurchasePanel product={product} />
      </div>

      <section className="mt-16" aria-label="ข้อมูลสินค้าเพิ่มเติม">
        <DetailTabs product={product} />
      </section>

      <section className="mt-20">
        <SectionHeader title="สินค้าที่เกี่ยวข้อง" href={`/products?category=${product.category}`} />
        <ProductGrid products={getRelatedProducts(product)} />
      </section>
    </Container>
  );
}
