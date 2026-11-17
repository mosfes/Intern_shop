"use client";

import { Button, Card, Chip, Tooltip } from "@heroui/react";
import Link from "next/link";
import { EyeIcon } from "@/components/icons";
import type { Product } from "@/lib/types";
import { useQuickView } from "./quick-view";
import { AddToCartButton, DiscountChip, Price, ProductImage, Rating, StockChip, WishlistButton } from "./product-bits";

interface ProductCardProps {
  product: Product;
  layout?: "grid" | "list";
  priority?: boolean;
}

export function ProductCard({ product, layout = "grid", priority }: ProductCardProps) {
  const quickView = useQuickView();
  const href = `/products/${product.slug}`;
  const isList = layout === "list";

  return (
    <Card
      className={`group relative h-full gap-0 overflow-hidden border border-border p-0 transition-all duration-300 ${
        isList ? "flex-row" : ""
      }`}
    >
      {/* Image */}
      <div className={`relative shrink-0 bg-art ${isList ? "w-36 sm:w-56" : "aspect-square w-full"}`}>
        <Link href={href} aria-label={product.name} className="absolute inset-0">
          <ProductImage src={product.images[0]} alt={product.name} priority={priority} className="motion-safe:group-hover:scale-105 motion-safe:group-focus-within:scale-105" />
        </Link>
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
          <DiscountChip discount={product.discount} />
          {product.tags.includes("new") && (
            <Chip size="sm" variant="primary" color="accent">
              ใหม่
            </Chip>
          )}
        </div>
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <WishlistButton product={product} />
          <Tooltip delay={300}>
            <Button
              isIconOnly
              size="sm"
              variant="tertiary"
              aria-label="ดูรายละเอียดด่วน"
              className="hidden rounded-full bg-surface/90 text-muted opacity-0 backdrop-blur transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 md:inline-flex"
              onPress={() => quickView.open(product)}
            >
              <EyeIcon size={18} />
            </Button>
            <Tooltip.Content>ดูด่วน</Tooltip.Content>
          </Tooltip>
        </div>
      </div>

      {/* Body */}
      <div className={`flex min-w-0 flex-1 flex-col ${isList ? "p-4 sm:p-5" : "p-3 sm:p-4"}`}>
        <Card.Content className="flex flex-1 flex-col gap-1.5 p-0">
          <span className="text-xs font-medium text-muted">{product.brand}</span>
          <Link
            href={href}
            className={`line-clamp-2 font-medium leading-snug text-foreground transition-colors hover:text-accent ${
              isList ? "text-base sm:text-lg" : "min-h-[2.6em] text-sm sm:text-[15px]"
            }`}
          >
            {product.name}
          </Link>
          {isList && <p className="mt-1 line-clamp-2 hidden text-sm text-muted sm:block">{product.description}</p>}
          <Rating value={product.rating} count={product.reviewCount} size={12} />
          <div className="mt-auto pt-2">
            <Price product={product} />
          </div>
        </Card.Content>
        <Card.Footer className="mt-3 flex items-center justify-between gap-2 p-0">
          <StockChip stock={product.stock} />
          <span className="sm:hidden">
            <AddToCartButton product={product} size="sm" compact />
          </span>
          <span className="hidden sm:inline-flex">
            <AddToCartButton product={product} size="sm" label="ใส่ตะกร้า" />
          </span>
        </Card.Footer>
      </div>
    </Card>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: Product[]; priorityCount?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}
