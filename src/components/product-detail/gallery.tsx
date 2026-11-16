"use client";

import { useState } from "react";
import { DiscountChip, ProductImage } from "@/components/product/product-bits";
import type { Product } from "@/lib/types";

const viewLabels = ["สินค้า", "เพิ่มเติม 1", "เพิ่มเติม 2"];

export function ProductGallery({ product }: { product: Product }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:gap-4">
      <div role="tablist" aria-label="รูปสินค้า" className="flex gap-3 sm:flex-col">
        {product.images.map((src, i) => (
          <button
            key={src}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-label={`ดูรูป${viewLabels[i] ?? i + 1}`}
            onClick={() => setActive(i)}
            className={`relative size-16 shrink-0 overflow-hidden rounded-xl border-2 bg-art transition-all sm:size-20 ${
              i === active ? "border-accent" : "border-transparent opacity-70 hover:opacity-100"
            }`}
          >
            <ProductImage src={src} alt="" sizes="80px" />
          </button>
        ))}
      </div>
      <div
        className="relative aspect-square flex-1 overflow-hidden rounded-xl border border-border bg-art"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
      >
        {product.images.map((src, i) => (
          <div
            key={src}
            className={`absolute inset-0 transition-opacity duration-500 ${i === active ? "opacity-100" : "opacity-0"}`}
            aria-hidden={i !== active}
          >
            <div
              className="absolute inset-0 transition-transform duration-200 ease-out"
              style={
                zoom && i === active
                  ? { transform: "scale(1.6)", transformOrigin: `${zoom.x}% ${zoom.y}%` }
                  : undefined
              }
            >
              <ProductImage
                src={src}
                alt={i === active ? `${product.name} — ${viewLabels[i] ?? ""}` : ""}
                priority={i === 0}
                sizes="(min-width: 1024px) 560px, 100vw"
              />
            </div>
          </div>
        ))}
        <div className="absolute left-4 top-4">
          <DiscountChip discount={product.discount} />
        </div>
        <span className="absolute bottom-4 right-4 hidden rounded-full bg-surface/80 px-3 py-1 text-xs text-muted backdrop-blur sm:inline">
          เลื่อนเมาส์เพื่อซูม
        </span>
      </div>
    </div>
  );
}
