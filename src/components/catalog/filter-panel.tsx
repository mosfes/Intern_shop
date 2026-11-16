"use client";

import { Button, Checkbox, CheckboxGroup, Label, Separator, Slider } from "@heroui/react";
import { useCatalog } from "@/components/catalog-provider";
import { PRICE_MIN } from "@/lib/catalog";
import { formatBaht } from "@/lib/format";
import type { CatalogFilters } from "@/lib/search";
import type { CategorySlug } from "@/lib/types";

export function defaultFilters(priceMax: number): CatalogFilters {
  return { categories: [], brands: [], price: [PRICE_MIN, priceMax], inStockOnly: false, onSaleOnly: false };
}

function FilterCheckbox({ value, label, count }: { value: string; label: string; count?: number }) {
  return (
    <Checkbox value={value} className="w-full">
      <Checkbox.Content className="w-full">
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <Label className="flex-1 cursor-pointer text-sm font-normal">{label}</Label>
        {count !== undefined && <span className="text-xs text-muted">{count}</span>}
      </Checkbox.Content>
    </Checkbox>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

export function FilterPanel({
  filters,
  onChange,
  onReset,
}: {
  filters: CatalogFilters;
  onChange: (f: CatalogFilters) => void;
  onReset: () => void;
}) {
  const { categories, categoryMap, categoryCounts, priceMax, brandsForCategories } = useCatalog();
  const set = <K extends keyof CatalogFilters>(key: K, value: CatalogFilters[K]) => onChange({ ...filters, [key]: value });
  const availableBrands = brandsForCategories(filters.categories);

  // Changing categories drops any selected brand that no longer has products in the new scope.
  const setCategories = (next: CategorySlug[]) => {
    const allowed = new Set(brandsForCategories(next).map((b) => b.brand));
    onChange({ ...filters, categories: next, brands: filters.brands.filter((b) => allowed.has(b)) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">ตัวกรองสินค้า</h2>
        <Button size="sm" variant="ghost" onPress={onReset} className="text-accent">
          ล้างทั้งหมด
        </Button>
      </div>

      <Group title="หมวดหมู่">
        <CheckboxGroup
          aria-label="หมวดหมู่"
          value={filters.categories}
          onChange={(v) => setCategories(v as CategorySlug[])}
          className="gap-2.5"
        >
          {categories.map((c) => (
            <FilterCheckbox key={c.slug} value={c.slug} label={c.nameTh} count={categoryCounts[c.slug]} />
          ))}
        </CheckboxGroup>
      </Group>

      <Separator />

      <Group title={filters.categories.length === 1 ? `แบรนด์${categoryMap.get(filters.categories[0])?.nameTh ?? ""}` : "แบรนด์"}>
        <CheckboxGroup aria-label="แบรนด์" value={filters.brands} onChange={(v) => set("brands", v)} className="gap-2.5">
          {availableBrands.map(({ brand, count }) => (
            <FilterCheckbox key={brand} value={brand} label={brand} count={count} />
          ))}
        </CheckboxGroup>
      </Group>

      <Separator />

      <Group title="ช่วงราคา">
        <Slider
          aria-label="ช่วงราคา"
          minValue={PRICE_MIN}
          maxValue={priceMax}
          step={500}
          value={filters.price}
          onChange={(v) => set("price", v as [number, number])}
          className="px-1"
        >
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb index={0} aria-label="ราคาต่ำสุด" />
            <Slider.Thumb index={1} aria-label="ราคาสูงสุด" />
          </Slider.Track>
        </Slider>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="rounded-lg border border-border bg-surface px-2.5 py-1 tabular-nums">{formatBaht(filters.price[0])}</span>
          <span className="text-muted">—</span>
          <span className="rounded-lg border border-border bg-surface px-2.5 py-1 tabular-nums">{formatBaht(filters.price[1])}</span>
        </div>
      </Group>

      <Separator />

      <Group title="สถานะสินค้า">
        <div className="space-y-2.5">
          <Checkbox isSelected={filters.inStockOnly} onChange={(v) => set("inStockOnly", v)}>
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <Label className="cursor-pointer text-sm font-normal">เฉพาะสินค้าพร้อมส่ง</Label>
            </Checkbox.Content>
          </Checkbox>
          <Checkbox isSelected={filters.onSaleOnly} onChange={(v) => set("onSaleOnly", v)}>
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <Label className="cursor-pointer text-sm font-normal">เฉพาะสินค้าลดราคา</Label>
            </Checkbox.Content>
          </Checkbox>
        </div>
      </Group>
    </div>
  );
}
