"use client";

import {
  Breadcrumbs,
  Button,
  Chip,
  Drawer,
  EmptyState,
  Label,
  ListBox,
  Pagination,
  SearchField,
  Select,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import { useMemo, useState } from "react";
import { CloseIcon, FilterIcon, GridIcon, ListIcon, SearchIcon } from "@/components/icons";
import { ProductCard } from "@/components/product/product-card";
import { useCatalog } from "@/components/catalog-provider";
import { PRICE_MIN } from "@/lib/catalog";
import { formatBaht } from "@/lib/format";
import { filterProducts, searchProducts, sortOptions, sortProducts, type CatalogFilters, type SortKey } from "@/lib/search";
import { BrandPicker } from "./brand-picker";
import { FilterPanel, defaultFilters } from "./filter-panel";

const PAGE_SIZE = 12;


export interface CatalogProps {
  mode: "products" | "search";
  initialFilters?: Partial<CatalogFilters>;
  initialQuery?: string;
  initialSort?: SortKey;
}

export function Catalog({ mode, initialFilters, initialQuery = "", initialSort = "featured" }: CatalogProps) {
  const { products, categoryMap, priceMax, brandsForCategories } = useCatalog();
  const [filters, setFilters] = useState<CatalogFilters>({ ...defaultFilters(priceMax), ...initialFilters });
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<SortKey>(initialSort);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const results = useMemo(
    () => sortProducts(filterProducts(searchProducts(query, products, categoryMap), filters), sort),
    [products, categoryMap, query, filters, sort],
  );
  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const update = (f: CatalogFilters) => {
    setFilters(f);
    setPage(1);
  };
  const reset = () => update(defaultFilters(priceMax));

  const singleCategory = (filters.categories.length === 1 && categoryMap.get(filters.categories[0])) || null;
  const availableBrands = useMemo(() => brandsForCategories(filters.categories), [brandsForCategories, filters.categories]);
  const title = mode === "search" ? (query ? `ผลการค้นหา “${query}”` : "ค้นหาสินค้า") : singleCategory?.nameTh ?? "สินค้าทั้งหมด";
  const description =
    mode === "search"
      ? "ค้นหาจากชื่อสินค้า แบรนด์ หมวดหมู่ หรือสเปก"
      : singleCategory?.description ?? "อุปกรณ์คอมพิวเตอร์คุณภาพสูง คัดสรรจากแบรนด์ชั้นนำ";

  const activeChips: { key: string; label: string; clear: () => void }[] = [
    ...filters.categories.map((c) => ({
      key: `c-${c}`,
      label: categoryMap.get(c)?.nameTh ?? c,
      clear: () => update({ ...filters, categories: filters.categories.filter((x) => x !== c) }),
    })),
    ...filters.brands.map((b) => ({
      key: `b-${b}`,
      label: b,
      clear: () => update({ ...filters, brands: filters.brands.filter((x) => x !== b) }),
    })),
    ...(filters.price[0] !== PRICE_MIN || filters.price[1] !== priceMax
      ? [
          {
            key: "price",
            label: `${formatBaht(filters.price[0])} – ${formatBaht(filters.price[1])}`,
            clear: () => update({ ...filters, price: [PRICE_MIN, priceMax] }),
          },
        ]
      : []),
    ...(filters.inStockOnly ? [{ key: "stock", label: "พร้อมส่ง", clear: () => update({ ...filters, inStockOnly: false }) }] : []),
    ...(filters.onSaleOnly ? [{ key: "sale", label: "ลดราคา", clear: () => update({ ...filters, onSaleOnly: false }) }] : []),
  ];

  const changePage = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-8 pt-6 sm:px-6">
      <Breadcrumbs className="mb-5">
        <Breadcrumbs.Item href="/">หน้าแรก</Breadcrumbs.Item>
        {mode === "search" ? (
          <Breadcrumbs.Item>ค้นหา</Breadcrumbs.Item>
        ) : singleCategory ? (
          [
            <Breadcrumbs.Item key="all" href="/products">
              สินค้าทั้งหมด
            </Breadcrumbs.Item>,
            <Breadcrumbs.Item key="cat">{singleCategory.nameTh}</Breadcrumbs.Item>,
          ]
        ) : (
          <Breadcrumbs.Item>สินค้าทั้งหมด</Breadcrumbs.Item>
        )}
      </Breadcrumbs>

      <header className="mb-6 flex flex-col gap-4 sm:mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-2 text-muted">{description}</p>
        </div>
        {mode === "search" && (
          <SearchField
            aria-label="ค้นหาสินค้า"
            value={query}
            onChange={(v) => {
              setQuery(v);
              setPage(1);
            }}
            className="max-w-xl"
            fullWidth
          >
            <SearchField.Group className="h-12 rounded-full">
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="พิมพ์ชื่อสินค้า เช่น RTX 5070, DDR5, 2TB" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        )}
      </header>

      {availableBrands.length > 1 && (
        <BrandPicker
          title={singleCategory ? `แบรนด์${singleCategory.nameTh}` : "เลือกตามแบรนด์"}
          options={availableBrands}
          selected={filters.brands}
          onChange={(brands) => update({ ...filters, brands })}
        />
      )}

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block" aria-label="ตัวกรองสินค้า">
          <div className="sticky top-36 max-h-[calc(100vh-10rem)] overflow-y-auto rounded-xl border border-border bg-surface p-5 no-scrollbar">
            <FilterPanel filters={filters} onChange={update} onReset={reset} />
          </div>
        </aside>

        <section aria-label="รายการสินค้า" className="min-w-0">
          {/* Toolbar */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Drawer isOpen={filtersOpen} onOpenChange={setFiltersOpen}>
              <Button variant="secondary" className="lg:hidden">
                <FilterIcon size={18} />
                ตัวกรอง
                {activeChips.length > 0 && (
                  <span className="grid size-5 place-items-center rounded-full bg-accent text-[11px] text-accent-foreground">
                    {activeChips.length}
                  </span>
                )}
              </Button>
              <Drawer.Backdrop>
                <Drawer.Content placement="bottom">
                  <Drawer.Dialog className="max-h-[88vh]">
                    <Drawer.Handle />
                    <Drawer.Header>
                      <Drawer.Heading className="sr-only">ตัวกรองสินค้า</Drawer.Heading>
                    </Drawer.Header>
                    <Drawer.Body className="overflow-y-auto">
                      <FilterPanel filters={filters} onChange={update} onReset={reset} />
                    </Drawer.Body>
                    <Drawer.Footer>
                      <Button fullWidth onPress={() => setFiltersOpen(false)}>
                        แสดงสินค้า {results.length} รายการ
                      </Button>
                    </Drawer.Footer>
                  </Drawer.Dialog>
                </Drawer.Content>
              </Drawer.Backdrop>
            </Drawer>

            <p className="text-sm text-muted" aria-live="polite">
              พบ <span className="font-semibold text-foreground">{results.length}</span> รายการ
            </p>

            <div className="ml-auto flex items-center gap-2">
              <Select
                aria-label="เรียงลำดับ"
                value={sort}
                onChange={(k) => {
                  if (k) setSort(k as SortKey);
                  setPage(1);
                }}
                className="w-44 sm:w-52"
              >
                <Label className="sr-only">เรียงลำดับ</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {sortOptions.map((o) => (
                      <ListBox.Item key={o.id} id={o.id} textValue={o.label}>
                        {o.label}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>

              <ToggleButtonGroup
                aria-label="รูปแบบการแสดงผล"
                selectionMode="single"
                disallowEmptySelection
                selectedKeys={[view]}
                onSelectionChange={(keys) => {
                  const v = [...keys][0];
                  if (v) setView(v as "grid" | "list");
                }}
                className="hidden sm:flex"
              >
                <ToggleButton id="grid" isIconOnly aria-label="มุมมองตาราง">
                  <GridIcon size={18} />
                </ToggleButton>
                <ToggleButton id="list" isIconOnly aria-label="มุมมองรายการ">
                  <ListIcon size={18} />
                </ToggleButton>
              </ToggleButtonGroup>
            </div>
          </div>

          {activeChips.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {activeChips.map((c) => (
                <Chip key={c.key} variant="soft" color="accent" className="gap-1 pr-1">
                  <Chip.Label>{c.label}</Chip.Label>
                  <button
                    type="button"
                    onClick={c.clear}
                    aria-label={`ลบตัวกรอง ${c.label}`}
                    className="grid size-5 place-items-center rounded-full hover:bg-accent/20"
                  >
                    <CloseIcon size={12} />
                  </button>
                </Chip>
              ))}
              <Button size="sm" variant="ghost" onPress={reset}>
                ล้างตัวกรอง
              </Button>
            </div>
          )}

          {visible.length === 0 ? (
            <EmptyState className="rounded-xl border border-dashed border-border bg-surface py-16">
              <span className="mb-4 grid size-14 place-items-center rounded-lg bg-surface-secondary text-muted">
                <SearchIcon size={26} />
              </span>
              <h2 className="text-lg font-semibold">ไม่พบสินค้าที่ตรงกับเงื่อนไข</h2>
              <p className="mt-1 max-w-sm text-center text-sm text-muted">ลองปรับตัวกรอง เปลี่ยนคำค้นหา หรือล้างตัวกรองทั้งหมด</p>
              <Button
                className="mt-5"
                variant="secondary"
                onPress={() => {
                  reset();
                  setQuery("");
                }}
              >
                ล้างการค้นหาและตัวกรอง
              </Button>
            </EmptyState>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 2xl:grid-cols-4">
              {visible.map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i < 3} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {visible.map((p) => (
                <ProductCard key={p.id} product={p} layout="list" />
              ))}
            </div>
          )}

          {pageCount > 1 && (
            <Pagination className="mt-10 justify-center">
              <Pagination.Content>
                <Pagination.Item>
                  <Pagination.Previous isDisabled={currentPage === 1} onPress={() => changePage(currentPage - 1)}>
                    <Pagination.PreviousIcon />
                    <span className="hidden sm:inline">ก่อนหน้า</span>
                  </Pagination.Previous>
                </Pagination.Item>
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                  <Pagination.Item key={p}>
                    <Pagination.Link isActive={p === currentPage} onPress={() => changePage(p)} aria-label={`หน้า ${p}`}>
                      {p}
                    </Pagination.Link>
                  </Pagination.Item>
                ))}
                <Pagination.Item>
                  <Pagination.Next isDisabled={currentPage === pageCount} onPress={() => changePage(currentPage + 1)}>
                    <span className="hidden sm:inline">ถัดไป</span>
                    <Pagination.NextIcon />
                  </Pagination.Next>
                </Pagination.Item>
              </Pagination.Content>
            </Pagination>
          )}
        </section>
      </div>
    </div>
  );
}
