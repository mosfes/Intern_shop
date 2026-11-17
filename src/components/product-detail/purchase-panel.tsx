"use client";

import { Button, Chip, Label, NumberField, Separator, toast } from "@heroui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BoltIcon, CheckIcon, RefreshIcon, ShieldIcon, TruckIcon } from "@/components/icons";
import { AddToCartButton, Price, Rating, StockChip, WishlistButton } from "@/components/product/product-bits";
import { useCatalog } from "@/components/catalog-provider";
import { formatBaht } from "@/lib/format";
import { CHECKOUT_LOGIN_HREF } from "@/lib/auth-redirect";
import { ADMIN_ORDER_BLOCKED_MESSAGE, storeActions, useIsAdmin, useStore } from "@/lib/store";
import type { Product } from "@/lib/types";

export function PurchasePanel({ product }: { product: Product }) {
  const [qty, setQty] = useState(1);
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const signedIn = useStore((s) => s.user !== null);
  const soldOut = product.stock <= 0;
  const category = useCatalog().categoryMap.get(product.category);

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/products?brand=${encodeURIComponent(product.brand)}`}
            className="text-sm font-medium text-accent hover:underline"
          >
            {product.brand}
          </Link>
          <span className="text-xs text-muted">·</span>
          <Link href={`/products?category=${product.category}`} className="text-xs text-muted hover:text-foreground">
            {category?.nameTh ?? product.category}
          </Link>
          {product.tags.includes("best-seller") && (
            <Chip size="sm" variant="soft" color="warning">
              ขายดี
            </Chip>
          )}
          {product.tags.includes("new") && (
            <Chip size="sm" variant="soft" color="accent">
              ใหม่
            </Chip>
          )}
        </div>
        <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{product.name}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Rating value={product.rating} count={product.reviewCount} size={16} />
          <span className="text-xs text-muted">รหัสสินค้า {product.id.toUpperCase()}</span>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <Price product={product} size="lg" />
        <p className="mt-1 text-xs text-muted">ราคารวม VAT</p>
        <div className="mt-3 grid w-fit auto-cols-fr grid-flow-col items-center gap-2 *:w-full *:justify-center *:whitespace-nowrap">
          <StockChip stock={product.stock} size="md" />
          {product.discount > 0 && (
            <Chip variant="primary" color="danger" size="md">
              ประหยัด {formatBaht(product.originalPrice - product.price)}
            </Chip>
          )}
        </div>
      </div>

      <ul className="grid gap-2 text-sm">
        {product.highlights.map((h) => (
          <li key={h} className="flex items-start gap-2">
            <CheckIcon size={18} className="mt-0.5 shrink-0 text-success" />
            {h}
          </li>
        ))}
      </ul>

      <Separator />

      <div className="grid gap-3 sm:flex sm:items-end">
        <NumberField
          value={qty}
          onChange={(v) => setQty(Number.isFinite(v) ? v : 1)}
          minValue={1}
          formatOptions={{ maximumFractionDigits: 0 }}
          maxValue={Math.max(1, product.stock)}
          isDisabled={soldOut}
          className="flex w-full flex-row items-center justify-between gap-3 sm:flex-col sm:items-stretch sm:w-36 sm:shrink-0"
        >
          <Label>จำนวน</Label>
          <NumberField.Group className="h-12 w-36 sm:w-full">
            <NumberField.DecrementButton />
            <NumberField.Input className="text-center" />
            <NumberField.IncrementButton />
          </NumberField.Group>
        </NumberField>
        <div className="flex flex-1 gap-2">
          <div className="flex-1 [&>button]:h-12">
            <AddToCartButton product={product} quantity={qty} fullWidth size="lg" />
          </div>
          <WishlistButton product={product} className="size-12 rounded-xl" />
        </div>
      </div>
      <Button
        size="lg"
        variant="secondary"
        fullWidth
        isDisabled={soldOut}
        onPress={() => {
          if (isAdmin) {
            toast.danger(ADMIN_ORDER_BLOCKED_MESSAGE);
            return;
          }
          storeActions.addToCart(product, qty);
          if (!signedIn) {
            toast("กรุณาเข้าสู่ระบบก่อนสั่งซื้อ", { description: "เพิ่มสินค้าลงตะกร้าให้แล้ว" });
            router.push(CHECKOUT_LOGIN_HREF);
            return;
          }
          router.push("/checkout");
        }}
      >
        <BoltIcon size={18} />
        ซื้อเลย
      </Button>

      <ul className="grid gap-3 rounded-xl border border-border bg-surface p-5 text-sm">
        <li className="flex gap-3">
          <TruckIcon className="shrink-0 text-accent" />
          <span>
            <span className="font-medium">จัดส่งฟรี</span> เมื่อซื้อครบ ฿3,000 · ได้รับภายใน 1–4 วันทำการ
          </span>
        </li>
        <li className="flex gap-3">
          <ShieldIcon className="shrink-0 text-accent" />
          <span>
            <span className="font-medium">รับประกัน {product.warranty}</span> ศูนย์ไทย
          </span>
        </li>
        <li className="flex gap-3">
          <RefreshIcon className="shrink-0 text-accent" />
          <span>เปลี่ยนสินค้าได้ภายใน 7 วัน หากพบปัญหาจากการผลิต</span>
        </li>
      </ul>
    </div>
  );
}
