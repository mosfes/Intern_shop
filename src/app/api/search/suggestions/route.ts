import { type NextRequest, NextResponse } from "next/server";
import { getCatalog } from "@/lib/catalog-server";
import { searchProducts, type SearchSuggestion } from "@/lib/search";

/** Header search suggestions — searched on the server so the browser doesn't need the whole catalogue. */
export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  if (query.length < 2) return NextResponse.json({ products: [] });
  const { products, categoryMap } = await getCatalog();
  const suggestions: SearchSuggestion[] = searchProducts(query, products, categoryMap)
    .slice(0, 5)
    .map((p) => ({ id: p.id, slug: p.slug, name: p.name, brand: p.brand, price: p.price, image: p.images[0] }));
  return NextResponse.json({ products: suggestions }, { headers: { "Cache-Control": "public, max-age=60" } });
}
