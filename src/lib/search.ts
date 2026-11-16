import type { Category, CategorySlug, Product } from "./types";

function haystack(p: Product, category: Category | undefined) {
  return [p.name, p.brand, category?.name, category?.nameTh, p.category, ...p.shortSpecs].join(" ").toLowerCase();
}

/** Every whitespace-separated term must match somewhere (AND search). */
export function searchProducts(query: string, list: Product[], categoryMap: Map<CategorySlug, Category>) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return list;
  return list.filter((p) => {
    const text = haystack(p, categoryMap.get(p.category));
    return terms.every((t) => text.includes(t));
  });
}

export type SortKey = "featured" | "price-asc" | "price-desc" | "rating" | "discount" | "newest";

export const sortOptions: { id: SortKey; label: string }[] = [
  { id: "featured", label: "แนะนำ" },
  { id: "price-asc", label: "ราคา: ต่ำ → สูง" },
  { id: "price-desc", label: "ราคา: สูง → ต่ำ" },
  { id: "rating", label: "คะแนนรีวิวสูงสุด" },
  { id: "discount", label: "ส่วนลดมากที่สุด" },
  { id: "newest", label: "สินค้าใหม่" },
];

export function sortProducts(list: Product[], sort: SortKey) {
  const copy = [...list];
  switch (sort) {
    case "price-asc":
      return copy.sort((a, b) => a.price - b.price);
    case "price-desc":
      return copy.sort((a, b) => b.price - a.price);
    case "rating":
      return copy.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    case "discount":
      return copy.sort((a, b) => b.discount - a.discount);
    case "newest":
      return copy.sort((a, b) => Number(b.tags.includes("new")) - Number(a.tags.includes("new")));
    default:
      return copy.sort(
        (a, b) =>
          Number(b.tags.includes("best-seller")) - Number(a.tags.includes("best-seller")) || b.reviewCount - a.reviewCount,
      );
  }
}

export interface CatalogFilters {
  categories: CategorySlug[];
  brands: string[];
  price: [number, number];
  inStockOnly: boolean;
  onSaleOnly: boolean;
}

export function filterProducts(list: Product[], f: CatalogFilters) {
  return list.filter(
    (p) =>
      (f.categories.length === 0 || f.categories.includes(p.category)) &&
      (f.brands.length === 0 || f.brands.includes(p.brand)) &&
      p.price >= f.price[0] &&
      p.price <= f.price[1] &&
      (!f.inStockOnly || p.stock > 0) &&
      (!f.onSaleOnly || p.discount > 0),
  );
}
