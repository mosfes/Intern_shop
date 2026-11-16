"use client";

import { Button, Card, EmptyState, NumberField, Skeleton, Tooltip, buttonVariants, toast } from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, CartIcon, CheckCircleIcon, ShieldIcon, TrashIcon } from "@/components/icons";
import { ProductGrid } from "@/components/product/product-card";
import { StockChip } from "@/components/product/product-bits";
import { useCatalog } from "@/components/catalog-provider";
import { FREE_SHIPPING_THRESHOLD, formatBaht } from "@/lib/format";
import { cartDetails, storeActions, useCartLines, useHydrated } from "@/lib/store";
import { OrderSummary } from "./order-summary";

export function CartView() {
  const hydrated = useHydrated();
  const lines = useCartLines();
  const { productMap, getProductsByTag } = useCatalog();
  const { items, subtotal, savings, count } = cartDetails(lines, productMap);

  if (!hydrated) return <CartSkeleton />;

  if (items.length === 0) {
    return (
      <div className="space-y-16">
        <EmptyState className="rounded-xl border border-dashed border-border bg-surface px-6 py-16">
          <span className="mb-4 grid size-16 place-items-center rounded-lg bg-accent-soft text-accent">
            <CartIcon size={30} />
          </span>
          <h2 className="text-xl font-semibold">ตะกร้าสินค้าของคุณยังว่างอยู่</h2>
          <p className="mt-1 max-w-sm text-center text-sm text-muted">เริ่มเลือกอุปกรณ์สำหรับคอมเครื่องใหม่ของคุณ มีดีลพิเศษรออยู่มากมาย</p>
          <Link href="/products" className={`${buttonVariants({ size: "lg" })} mt-6`}>
            เลือกซื้อสินค้า
            <ArrowRightIcon size={18} />
          </Link>
        </EmptyState>
        <section>
          <h2 className="mb-6 text-2xl font-semibold tracking-tight">สินค้าขายดีที่คุณอาจสนใจ</h2>
          <ProductGrid products={getProductsByTag("best-seller", 4)} />
        </section>
      </div>
    );
  }

  const freeShipPct = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <section aria-label="สินค้าในตะกร้า" className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">{count} ชิ้น</p>
          <Button
            size="sm"
            variant="ghost"
            onPress={() => {
              storeActions.clearCart();
              toast("ล้างตะกร้าสินค้าแล้ว");
            }}
          >
            ล้างตะกร้า
          </Button>
        </div>
        {items.map(({ product, quantity }) => (
          <Card key={product.id} className="flex-row gap-4 border border-border p-3 sm:p-4">
            <Link
              href={`/products/${product.slug}`}
              className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-art sm:size-28"
              aria-label={product.name}
            >
              <Image src={product.images[0]} alt="" fill sizes="112px" className="bg-white object-contain p-1 " />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted">{product.brand}</p>
                  <Link href={`/products/${product.slug}`} className="line-clamp-2 font-medium leading-snug hover:text-accent">
                    {product.name}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-muted">{product.shortSpecs.join(" · ")}</p>
                </div>
                <Tooltip delay={300}>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    aria-label={`ลบ ${product.name}`}
                    className="text-muted hover:text-danger"
                    onPress={() => {
                      storeActions.removeFromCart(product.id);
                      toast("นำสินค้าออกจากตะกร้าแล้ว", {
                        description: product.name,
                        actionProps: {
                          children: "เลิกทำ",
                          onPress: () => storeActions.addToCart(product, quantity),
                        },
                      });
                    }}
                  >
                    <TrashIcon size={18} />
                  </Button>
                  <Tooltip.Content>ลบออกจากตะกร้า</Tooltip.Content>
                </Tooltip>
              </div>
              <div className="mt-auto flex flex-wrap items-end justify-between gap-3">
                <div className="flex items-center gap-3">
                  <NumberField
                    aria-label={`จำนวน ${product.name}`}
                    value={quantity}
                    minValue={1}
                    formatOptions={{ maximumFractionDigits: 0 }}
                    maxValue={product.stock}
                    onChange={(v) => Number.isFinite(v) && storeActions.setQuantity(product, v)}
                    className="w-28"
                  >
                    <NumberField.Group>
                      <NumberField.DecrementButton />
                      <NumberField.Input className="text-center" />
                      <NumberField.IncrementButton />
                    </NumberField.Group>
                  </NumberField>
                  <span className="hidden sm:inline-flex">
                    <StockChip stock={product.stock} />
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">{formatBaht(product.price * quantity)}</p>
                  {quantity > 1 && <p className="text-xs text-muted">{formatBaht(product.price)} / ชิ้น</p>}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </section>

      <aside className="lg:sticky lg:top-36 lg:self-start">
        <OrderSummary subtotal={subtotal} savings={savings} shipping={null}>
          <div>
            <div className="mb-1.5 flex justify-between text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                {freeShipPct >= 100 ? (
                  <>
                    คุณได้รับสิทธิ์ส่งฟรีแล้ว
                    <CheckCircleIcon size={14} className="shrink-0 text-success" />
                  </>
                ) : "ความคืบหน้าสู่การส่งฟรี"}
              </span>
              <span>{freeShipPct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-secondary">
              <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${freeShipPct}%` }} />
            </div>
          </div>
          <Link href="/checkout" className={buttonVariants({ size: "lg", fullWidth: true })}>
            ดำเนินการชำระเงิน
            <ArrowRightIcon size={18} />
          </Link>
          <Link href="/products" className={buttonVariants({ variant: "ghost", fullWidth: true })}>
            เลือกซื้อสินค้าต่อ
          </Link>
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
            <ShieldIcon size={14} /> ระบบชำระเงินจำลอง ไม่มีการตัดเงินจริง
          </p>
        </OrderSummary>
      </aside>
    </div>
  );
}

export function CartSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]" aria-busy="true">
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="flex gap-4 rounded-xl border border-border bg-surface p-4">
            <Skeleton className="size-28 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-8 w-28 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}
