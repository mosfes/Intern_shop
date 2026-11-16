"use client";

import { Tabs } from "@heroui/react";
import { ProductGrid } from "@/components/product/product-card";
import { useCatalog } from "@/components/catalog-provider";
import type { ProductTag } from "@/lib/types";

const tabs: { id: ProductTag; label: string }[] = [
  { id: "best-seller", label: "ขายดี" },
  { id: "new", label: "มาใหม่" },
  { id: "recommended", label: "แนะนำ" },
  { id: "special-offer", label: "ข้อเสนอพิเศษ" },
];

export function FeaturedTabs() {
  const { getProductsByTag } = useCatalog();
  return (
    <Tabs defaultSelectedKey="best-seller" className="w-full">
      <Tabs.ListContainer className="mb-6 overflow-x-auto no-scrollbar">
        <Tabs.List aria-label="สินค้าแนะนำ" className="w-max">
          {tabs.map((t) => (
            <Tabs.Tab key={t.id} id={t.id} className="whitespace-nowrap px-4">
              {t.label}
              <Tabs.Indicator />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
      {tabs.map((t) => (
        <Tabs.Panel key={t.id} id={t.id} className="animate-fade-up">
          <ProductGrid products={getProductsByTag(t.id, 8)} />
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}
