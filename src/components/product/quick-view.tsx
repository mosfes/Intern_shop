"use client";

import { Modal, buttonVariants } from "@heroui/react";
import Link from "next/link";
import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";
import { useCatalogMeta } from "@/components/catalog-provider";
import { usePriceTime } from "./use-priced-product";
import { withFlashSalePrice } from "@/lib/flash-sale";
import type { Product } from "@/lib/types";
import { AddToCartButton, DiscountChip, Price, ProductImage, StockChip, WishlistButton } from "./product-bits";

const QuickViewContext = createContext<{ open: (p: Product) => void }>({ open: () => {} });

export function useQuickView() {
  return use(QuickViewContext);
}

export function QuickViewProvider({ children }: { children: ReactNode }) {
  const { categoryMap } = useCatalogMeta();
  const [selectedProduct, setProduct] = useState<Product | null>(null);
  const now = usePriceTime(selectedProduct ? [selectedProduct] : []);
  const product = selectedProduct ? withFlashSalePrice(selectedProduct, now) : null;
  const [isOpen, setOpen] = useState(false);
  const open = useCallback((p: Product) => {
    setProduct(p);
    setOpen(true);
  }, [setOpen, setProduct]);
  const value = useMemo(() => ({ open }), [open]);

  return (
    <QuickViewContext value={value}>
      {children}
      <Modal.Backdrop isOpen={isOpen} onOpenChange={setOpen} variant="blur">
        <Modal.Container size="lg" placement="center">
          <Modal.Dialog className="max-w-3xl">
            {product && (
              <>
                <Modal.CloseTrigger />
                <Modal.Header className="sr-only">
                  <Modal.Heading>{product.name}</Modal.Heading>
                </Modal.Header>
                <Modal.Body className="grid gap-6 p-1 sm:grid-cols-2">
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-art">
                    <ProductImage src={product.images[0]} alt={product.name} sizes="(min-width: 640px) 360px, 90vw" />
                    <div className="absolute left-3 top-3">
                      <DiscountChip discount={product.discount} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <span className="text-xs font-medium text-muted">
                      {product.brand} · {categoryMap.get(product.category)?.nameTh}
                    </span>
                    <h2 className="text-xl font-semibold leading-snug">{product.name}</h2>
                    <Price product={product} size="lg" />
                    <StockChip stock={product.stock} />
                    <ul className="space-y-1 text-sm text-muted">
                      {product.highlights.map((h) => (
                        <li key={h} className="flex gap-2">
                          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                          {h}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto flex flex-wrap gap-2 pt-2">
                      <div className="flex-1">
                        <AddToCartButton product={product} fullWidth />
                      </div>
                      <WishlistButton product={product} className="size-10" />
                    </div>
                    <Link
                      href={`/products/${product.slug}`}
                      onClick={() => setOpen(false)}
                      className={buttonVariants({ variant: "ghost", fullWidth: true })}
                    >
                      ดูรายละเอียดสินค้าทั้งหมด
                    </Link>
                  </div>
                </Modal.Body>
              </>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </QuickViewContext>
  );
}
