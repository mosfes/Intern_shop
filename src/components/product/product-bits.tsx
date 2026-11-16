"use client";

import { Button, Chip, Tooltip, toast } from "@heroui/react";
import Image from "next/image";
import { useState } from "react";
import { CartIcon, CheckIcon, HeartIcon, StarIcon } from "@/components/icons";
import { formatBaht, stockStatus } from "@/lib/format";
import { storeActions, useIsWishlisted } from "@/lib/store";
import type { Product } from "@/lib/types";

export function ProductImage({
  src,
  alt,
  sizes = "(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw",
  priority,
  className,
}: {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      loading={priority ? "eager" : undefined}
      fetchPriority={priority ? "high" : undefined}
      className={`bg-white object-contain p-[8%] transition-transform duration-500 ease-out ${className ?? ""}`}
    />
  );
}

export function Rating({ value, count, size = 14 }: { value: number; count?: number; size?: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`คะแนน ${value} จาก 5`}>
      <div className="flex text-amber-400">
        {Array.from({ length: 5 }, (_, i) => (
          <StarIcon key={i} size={size} filled={i < Math.round(value)} className={i < Math.round(value) ? "" : "text-border"} />
        ))}
      </div>
      <span className="text-xs font-medium text-foreground">{value.toFixed(1)}</span>
      {count !== undefined && <span className="text-xs text-muted">({count.toLocaleString("en-US")})</span>}
    </div>
  );
}

export function Price({ product, size = "md" }: { product: Product; size?: "md" | "lg" }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className={`font-semibold tracking-tight text-foreground ${size === "lg" ? "text-3xl" : "text-lg"}`}>
        {formatBaht(product.price)}
      </span>
      {product.discount > 0 && (
        <span className={`text-muted line-through ${size === "lg" ? "text-base" : "text-sm"}`}>
          {formatBaht(product.originalPrice)}
        </span>
      )}
    </div>
  );
}

export function StockChip({ stock, size = "sm" }: { stock: number; size?: "sm" | "md" }) {
  const s = stockStatus(stock);
  return (
    <Chip size={size} variant="soft" color={s.color}>
      <span className={`size-1.5 rounded-full ${s.color === "success" ? "bg-success" : s.color === "warning" ? "bg-warning" : "bg-danger"}`} />
      <Chip.Label>{s.label}</Chip.Label>
    </Chip>
  );
}

export function DiscountChip({ discount }: { discount: number }) {
  if (discount <= 0) return null;
  return (
    <Chip size="sm" variant="primary" color="danger" className="font-semibold">
      -{discount}%
    </Chip>
  );
}

export function WishlistButton({ product, className }: { product: Product; className?: string }) {
  const active = useIsWishlisted(product.id);
  const label = active ? "นำออกจากรายการโปรด" : "เพิ่มในรายการโปรด";
  return (
    <Tooltip delay={300}>
      <Button
        isIconOnly
        size="sm"
        variant="tertiary"
        aria-label={label}
        aria-pressed={active}
        className={`rounded-full bg-surface/90 backdrop-blur ${active ? "text-danger" : "text-muted hover:text-danger"} ${className ?? ""}`}
        onPress={() => {
          const added = storeActions.toggleWishlist(product.id);
          toast(added ? "เพิ่มในรายการโปรดแล้ว" : "นำออกจากรายการโปรดแล้ว", {
            description: product.name,
            timeout: 2500,
          });
        }}
      >
        <HeartIcon size={18} fill={active ? "currentColor" : "none"} />
      </Button>
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip>
  );
}

export function AddToCartButton({
  product,
  quantity = 1,
  fullWidth,
  size = "md",
  label = "หยิบใส่ตะกร้า",
  compact,
}: {
  product: Product;
  quantity?: number;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
  label?: string;
  compact?: boolean;
}) {
  const [added, setAdded] = useState(false);
  const soldOut = product.stock <= 0;
  return (
    <Button
      size={size}
      fullWidth={fullWidth}
      variant={soldOut ? "secondary" : "primary"}
      isDisabled={soldOut}
      isIconOnly={compact}
      aria-label={compact ? label : undefined}
      className="transition-all duration-200"
      onPress={() => {
        if (storeActions.addToCart(product, quantity)) {
          setAdded(true);
          window.setTimeout(() => setAdded(false), 1600);
          toast.success("เพิ่มลงตะกร้าแล้ว", {
            description: `${product.name} × ${quantity}`,
            timeout: 3000,
          });
        }
      }}
    >
      {added ? <CheckIcon size={18} /> : <CartIcon size={18} />}
      {!compact && (soldOut ? "สินค้าหมด" : added ? "เพิ่มแล้ว" : label)}
    </Button>
  );
}
