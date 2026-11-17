"use client";

import { Button, Checkbox, CheckboxGroup, Label, Separator, Slider } from "@heroui/react";
import { useState } from "react";
import { useCatalogMeta } from "@/components/catalog-provider";
import { PRICE_MIN } from "@/lib/catalog";
import type { CatalogPanel } from "@/lib/catalog-query";
import { formatBaht } from "@/lib/format";
import type { CatalogFilters } from "@/lib/search";
import { pruneSpecs } from "@/lib/spec-filters";
import type { CategorySlug } from "@/lib/types";

function FilterCheckbox({ value, label, count, dim }: { value: string; label: string; count?: number; dim?: boolean }) {
  return (
    <Checkbox value={value} className={dim ? "w-full opacity-50" : "w-full"}>
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

/** Counts, brands and spec options come from the server (see lib/catalog-query.ts) for the current filters. */
export function FilterPanel({
  filters,
  panel,
  onChange,
  onReset,
}: {
  filters: CatalogFilters;
  panel: CatalogPanel;
  onChange: (f: CatalogFilters) => void;
  onReset: () => void;
}) {
  const { categories, categoryMap } = useCatalogMeta();
  const { categoryCounts, priceMax, brands: availableBrands, specGroups } = panel;
  const set = <K extends keyof CatalogFilters>(key: K, value: CatalogFilters[K]) => onChange({ ...filters, [key]: value });
  // While a thumb is dragged the range is only shown here; the listing updates once on release.
  const [draggedPrice, setDraggedPrice] = useState<[number, number] | null>(null);

  // Brands that have no products in the new categories are dropped by the server when it reads the URL.
  const setCategories = (next: CategorySlug[]) => {
    onChange({ ...filters, categories: next, specs: pruneSpecs(filters.specs, next) });
  };
  const setSpec = (key: string, values: string[]) => {
    const { [key]: _omit, ...rest } = filters.specs; // eslint-disable-line @typescript-eslint/no-unused-vars
    onChange({ ...filters, specs: values.length ? { ...rest, [key]: values } : rest });
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

      {specGroups.map(({ slug, facets }) => (
        <div key={slug} className="space-y-5">
          <Separator />
          {filters.categories.length > 1 && (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">สเปก{categoryMap.get(slug)?.nameTh ?? slug}</p>
          )}
          {facets.map(({ key, title, options }) => (
            <Group key={key} title={title}>
              <CheckboxGroup
                aria-label={title}
                value={filters.specs[key] ?? []}
                onChange={(v) => setSpec(key, v)}
                className="gap-2.5"
              >
                {options.map((o) => (
                  <FilterCheckbox key={o.value} value={o.value} label={o.value} count={o.count} dim={o.count === 0} />
                ))}
              </CheckboxGroup>
            </Group>
          ))}
        </div>
      ))}

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
          value={draggedPrice ?? filters.price}
          onChange={(v) => setDraggedPrice(v as [number, number])}
          onChangeEnd={(v) => {
            setDraggedPrice(null);
            set("price", v as [number, number]);
          }}
          className="px-1"
        >
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb index={0} aria-label="ราคาต่ำสุด" />
            <Slider.Thumb index={1} aria-label="ราคาสูงสุด" />
          </Slider.Track>
        </Slider>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="rounded-lg border border-border bg-surface px-2.5 py-1 tabular-nums">{formatBaht((draggedPrice ?? filters.price)[0])}</span>
          <span className="text-muted">—</span>
          <span className="rounded-lg border border-border bg-surface px-2.5 py-1 tabular-nums">{formatBaht((draggedPrice ?? filters.price)[1])}</span>
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
