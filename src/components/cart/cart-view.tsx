"use client";

import { Button, Card, Checkbox, Label, NumberField, Skeleton, Tooltip, buttonVariants, toast } from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, CartIcon, CheckCircleIcon, ShieldIcon, TrashIcon } from "@/components/icons";
import { ProductGrid } from "@/components/product/product-card";
import { StockChip } from "@/components/product/product-bits";
import { useCatalog } from "@/components/catalog-provider";
import { FREE_SHIPPING_THRESHOLD, formatBaht } from "@/lib/format";
import type { Category } from "@/lib/types";
import { AdminOrderNotice } from "@/components/account/admin-order-notice";
import { CHECKOUT_LOGIN_HREF } from "@/lib/auth-redirect";
import { cartDetails, storeActions, useCartLines, useHydrated, useIsAdmin, useStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { OrderSummary } from "./order-summary";

export function CartView() {
  const hydrated = useHydrated();
  const isAdmin = useIsAdmin();
  const signedIn = useStore((s) => s.user !== null);
  const router = useRouter();
  const lines = useCartLines();
  const { productMap, getProductsByTag, categories } = useCatalog();
  const { items, selectedItems, subtotal, savings, count, selectedCount } = cartDetails(lines, productMap);

  if (!hydrated) return <CartSkeleton />;
  if (isAdmin) return <AdminOrderNotice />;

  if (items.length === 0) {
    return (
      <div className="space-y-12">
        <section className="flex flex-col items-center rounded-xl border border-border bg-surface px-5 py-10 text-center sm:px-6 sm:py-14">
          <span className="mb-5 grid size-16 place-items-center rounded-xl bg-surface-secondary text-muted">
            <CartIcon size={30} />
          </span>
          <h2 className="text-xl font-semibold">ตะกร้าสินค้าของคุณยังว่างอยู่</h2>
          <p className="mt-1.5 max-w-xl text-sm text-muted">เริ่มเลือกอุปกรณ์สำหรับคอมเครื่องใหม่ของคุณ มีดีลพิเศษรออยู่มากมาย</p>
          <div className="mt-6 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <Link href="/products" className={`${buttonVariants({ size: "lg" })} w-full sm:w-auto`}>
              เลือกซื้อสินค้า
              <ArrowRightIcon size={18} />
            </Link>
            <Link href="/pc-builder" className={`${buttonVariants({ size: "lg", variant: "outline" })} w-full sm:w-auto`}>
              จัดสเปคคอมเอง
            </Link>
          </div>
        </section>

        {categories.length > 0 && (
          <section aria-label="เลือกซื้อตามหมวดหมู่">
            <h2 className="mb-4 text-lg font-semibold">เลือกซื้อตามหมวดหมู่</h2>
            {/* Static row: swipe/scroll by hand, no auto-scroll. */}
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <CategoryChips categories={categories} />
            </div>
          </section>
        )}

        <section>
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="min-w-0 text-xl font-semibold tracking-tight sm:text-2xl">สินค้าขายดีที่คุณอาจสนใจ</h2>
            <Link href="/products" className="group inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-medium text-accent hover:text-foreground">
              ดูทั้งหมด
              <ArrowRightIcon size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <ProductGrid products={getProductsByTag("best-seller", 4)} />
        </section>
      </div>
    );
  }

  const freeShipPct = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));
  const allSelected = selectedItems.length === items.length;
  const someSelected = selectedItems.length > 0 && !allSelected;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <section aria-label="สินค้าในตะกร้า" className="space-y-3">
        <div className="flex items-center justify-between">
          <Checkbox
            isSelected={allSelected}
            isIndeterminate={someSelected}
            onChange={(checked) => storeActions.setAllSelected(checked)}
            aria-label="เลือกสินค้าทั้งหมด"
          >
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <Label className="cursor-pointer text-sm">
                เลือกทั้งหมด <span className="text-muted">({selectedItems.length}/{items.length} รายการ · {count} ชิ้น)</span>
              </Label>
            </Checkbox.Content>
          </Checkbox>
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
        {items.map(({ product, quantity, selected }) => (
          <Card
            key={product.id}
            className={`flex-row items-center gap-3 border p-3 transition-colors sm:gap-4 sm:p-4 ${selected ? "border-border" : "border-border/60 bg-surface-secondary/40"}`}
          >
            <Checkbox
              isSelected={selected}
              onChange={() => storeActions.toggleSelected(product.id)}
              aria-label={`เลือก ${product.name}`}
              className="shrink-0"
            >
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
              </Checkbox.Content>
            </Checkbox>
            <Link
              href={`/products/${product.slug}`}
              className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-art sm:size-28"
              aria-label={product.name}
            >
              <Image src={product.images[0]} alt="" fill sizes="112px" className="bg-white object-contain p-1 " />
            </Link>
            <div className={`flex min-w-0 flex-1 flex-col gap-2 self-stretch transition-opacity ${selected ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted">{product.brand}</p>
                  <Link href={`/products/${product.slug}`} className="line-clamp-2 font-medium leading-snug hover:text-accent">
                    {product.name}
                  </Link>
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
          {selectedItems.length > 0 ? (
            signedIn ? (
              <Link href="/checkout" className={buttonVariants({ size: "lg", fullWidth: true })}>
                ดำเนินการชำระเงิน ({selectedCount} ชิ้น)
                <ArrowRightIcon size={18} />
              </Link>
            ) : (
              <Button
                size="lg"
                fullWidth
                onPress={() => {
                  toast("กรุณาเข้าสู่ระบบก่อนสั่งซื้อ", { description: "สินค้าในตะกร้าของคุณจะยังอยู่ครบ" });
                  router.push(CHECKOUT_LOGIN_HREF);
                }}
              >
                เข้าสู่ระบบเพื่อสั่งซื้อ ({selectedCount} ชิ้น)
                <ArrowRightIcon size={18} />
              </Button>
            )
          ) : (
            <Button size="lg" fullWidth isDisabled>
              เลือกสินค้าอย่างน้อย 1 รายการ
            </Button>
          )}
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

/** One full set of category chips. The marquee renders it twice so the loop is seamless;
 * the duplicate is hidden from screen readers and keyboard focus. */
export function CategoryChips({ categories }: { categories: Category[] }) {
  return (
    <ul className="flex w-max gap-3 pb-2">
      {categories.map((c) => (
        <li key={c.slug}>
          <Link
            href={`/products?category=${c.slug}`}
            className="group flex items-center gap-3 rounded-xl border border-border bg-surface py-2 pl-2 pr-4 transition-colors hover:border-accent/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <span className="relative size-11 overflow-hidden rounded-lg bg-white">
              <Image src={c.image} alt="" fill sizes="44px" className="object-contain p-1" />
            </span>
            <span className="whitespace-nowrap text-sm font-medium transition-colors group-hover:text-accent">{c.nameTh}</span>
          </Link>
        </li>
      ))}
    </ul>
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
