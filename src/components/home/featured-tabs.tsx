"use client";

import { Tabs } from "@heroui/react";
import { ProductGrid } from "@/components/product/product-card";
import type { Product, ProductTag } from "@/lib/types";

export type FeaturedTab = { id: ProductTag; label: string; products: Product[] };

/** Products per tab are picked on the server (see app/page.tsx) so the catalogue isn't shipped to the browser. */
export function FeaturedTabs({ tabs }: { tabs: FeaturedTab[] }) {
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
        <Tabs.Panel key={t.id} id={t.id}>
          <ProductGrid products={t.products} />
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}
