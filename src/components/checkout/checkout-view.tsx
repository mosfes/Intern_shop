"use client";

import {
  Button,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  Radio,
  RadioGroup,
  TextArea,
  TextField,
  buttonVariants,
} from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { CartSkeleton } from "@/components/cart/cart-view";
import { OrderSummary } from "@/components/cart/order-summary";
import { BankIcon, CartIcon, CashIcon, CheckIcon, CreditCardIcon, QrIcon, ShieldIcon } from "@/components/icons";
import { useCatalog } from "@/components/catalog-provider";
import { formatBaht, shippingCost, shippingOptions, type ShippingId } from "@/lib/format";
import { cartDetails, storeActions, useCartLines, useHydrated, useStore } from "@/lib/store";
import type { Order } from "@/lib/types";

const paymentMethods = [
  { id: "card", label: "บัตรเครดิต / เดบิต", description: "Visa, Mastercard, JCB", icon: CreditCardIcon },
  { id: "promptpay", label: "พร้อมเพย์ QR", description: "สแกนจ่ายผ่านแอปธนาคาร", icon: QrIcon },
  { id: "transfer", label: "โอนผ่านธนาคาร", description: "แนบสลิปภายใน 24 ชม.", icon: BankIcon },
  { id: "cod", label: "เก็บเงินปลายทาง", description: "ค่าบริการเพิ่ม ฿30", icon: CashIcon },
] as const;
type PaymentId = (typeof paymentMethods)[number]["id"];

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 sm:p-6" aria-labelledby={`step-${n}`}>
      <h2 id={`step-${n}`} className="mb-5 flex items-center gap-3 text-lg font-semibold">
        <span className="grid size-7 place-items-center rounded-full bg-accent text-sm text-accent-foreground">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

const radioCard =
  "w-full rounded-xl border border-border p-4 transition-colors hover:border-accent/40 data-[selected=true]:border-accent data-[selected=true]:bg-accent-soft/40";

export function CheckoutView() {
  const hydrated = useHydrated();
  const lines = useCartLines();
  const user = useStore((s) => s.user);
  const { productMap } = useCatalog();
  const { items, subtotal, savings } = cartDetails(lines, productMap);
  const [shipping, setShipping] = useState<ShippingId>("standard");
  const [payment, setPayment] = useState<PaymentId>("card");
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState<Order | null>(null);

  if (!hydrated) return <CartSkeleton />;
  if (placed) return <Confirmation order={placed} />;

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
        <span className="mx-auto mb-4 grid size-16 place-items-center rounded-lg bg-accent-soft text-accent">
          <CartIcon size={30} />
        </span>
        <h2 className="text-xl font-semibold">ไม่มีสินค้าสำหรับชำระเงิน</h2>
        <p className="mt-1 text-sm text-muted">เพิ่มสินค้าลงตะกร้าก่อนดำเนินการชำระเงิน</p>
        <Link href="/products" className={`${buttonVariants()} mt-6`}>
          เลือกซื้อสินค้า
        </Link>
      </div>
    );
  }

  const ship = shippingCost(shipping, subtotal) + (payment === "cod" ? 30 : 0);

  return (
    <Form
      className="grid gap-8 lg:grid-cols-[1fr_380px]"
      onSubmit={(e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
        setSubmitting(true);
        // Simulated processing delay — no real payment or network call happens.
        window.setTimeout(() => {
          const order: Order = {
            id: `CB${Date.now().toString().slice(-8)}`,
            createdAt: new Date().toISOString(),
            status: "processing",
            lines: items.map((i) => ({
              productId: i.product.id,
              name: i.product.name,
              image: i.product.images[0],
              price: i.product.price,
              quantity: i.quantity,
            })),
            subtotal,
            shipping: ship,
            total: subtotal + ship,
            shippingMethod: shippingOptions.find((o) => o.id === shipping)!.label,
            paymentMethod: paymentMethods.find((p) => p.id === payment)!.label,
            address: `${data.fullName} · ${data.address} ${data.district} ${data.province} ${data.postcode}`,
          };
          storeActions.placeOrder(order);
          setPlaced(order);
          setSubmitting(false);
          window.scrollTo({ top: 0 });
        }, 900);
      }}
    >
      <div className="min-w-0 space-y-5">
        <Step n={1} title="ข้อมูลการจัดส่ง">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="fullName" isRequired defaultValue={user?.name} autoComplete="name">
              <Label>ชื่อ-นามสกุล</Label>
              <Input placeholder="สมชาย ใจดี" />
              <FieldError>กรุณากรอกชื่อผู้รับ</FieldError>
            </TextField>
            <TextField name="phone" type="tel" isRequired defaultValue={user?.phone} autoComplete="tel" pattern="[0-9\- ]{9,12}">
              <Label>เบอร์โทรศัพท์</Label>
              <Input placeholder="08x-xxx-xxxx" />
              <FieldError>กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง</FieldError>
            </TextField>
            <TextField name="email" type="email" isRequired defaultValue={user?.email} autoComplete="email" className="sm:col-span-2">
              <Label>อีเมล</Label>
              <Input placeholder="you@email.com" />
              <Description>ใช้สำหรับส่งใบยืนยันคำสั่งซื้อ (เดโม)</Description>
              <FieldError>กรุณากรอกอีเมลให้ถูกต้อง</FieldError>
            </TextField>
            <TextField name="address" isRequired className="sm:col-span-2" autoComplete="street-address">
              <Label>ที่อยู่</Label>
              <TextArea placeholder="บ้านเลขที่ อาคาร ถนน" rows={2} />
              <FieldError>กรุณากรอกที่อยู่</FieldError>
            </TextField>
            <TextField name="district" isRequired>
              <Label>เขต / อำเภอ</Label>
              <Input />
              <FieldError>จำเป็นต้องกรอก</FieldError>
            </TextField>
            <TextField name="province" isRequired defaultValue="กรุงเทพมหานคร">
              <Label>จังหวัด</Label>
              <Input />
              <FieldError>จำเป็นต้องกรอก</FieldError>
            </TextField>
            <TextField name="postcode" isRequired inputMode="numeric" pattern="[0-9]{5}" autoComplete="postal-code">
              <Label>รหัสไปรษณีย์</Label>
              <Input placeholder="10330" maxLength={5} />
              <FieldError>รหัสไปรษณีย์ 5 หลัก</FieldError>
            </TextField>
          </div>
        </Step>

        <Step n={2} title="วิธีการจัดส่ง">
          <RadioGroup aria-label="วิธีการจัดส่ง" value={shipping} onChange={(v) => setShipping(v as ShippingId)} className="gap-3">
            {shippingOptions.map((o) => {
              const cost = shippingCost(o.id, subtotal);
              return (
                <Radio key={o.id} value={o.id} className={radioCard}>
                  <Radio.Content className="w-full">
                    <Radio.Control>
                      <Radio.Indicator />
                    </Radio.Control>
                    <div className="flex flex-1 items-center justify-between gap-3">
                      <div>
                        <Label className="cursor-pointer font-medium">{o.label}</Label>
                        <p className="text-xs text-muted">{o.description}</p>
                      </div>
                      <span className="text-sm font-semibold">{cost === 0 ? "ฟรี" : formatBaht(cost)}</span>
                    </div>
                  </Radio.Content>
                </Radio>
              );
            })}
          </RadioGroup>
        </Step>

        <Step n={3} title="วิธีการชำระเงิน">
          <RadioGroup
            aria-label="วิธีการชำระเงิน"
            value={payment}
            onChange={(v) => setPayment(v as PaymentId)}
            className="grid gap-3 sm:grid-cols-2"
          >
            {paymentMethods.map((m) => (
              <Radio key={m.id} value={m.id} className={radioCard}>
                <Radio.Content className="w-full">
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  <m.icon size={22} className="shrink-0 text-accent" />
                  <div>
                    <Label className="cursor-pointer font-medium">{m.label}</Label>
                    <p className="text-xs text-muted">{m.description}</p>
                  </div>
                </Radio.Content>
              </Radio>
            ))}
          </RadioGroup>
          <div className="mt-4 rounded-xl border border-dashed border-border bg-surface-secondary/60 p-4 text-sm text-muted">
            {payment === "card" && "ในระบบจริงจะแสดงฟอร์มบัตรที่ปลอดภัยจากผู้ให้บริการชำระเงิน — เว็บไซต์เดโมนี้ไม่รับและไม่เก็บข้อมูลบัตร"}
            {payment === "promptpay" && "หลังยืนยันคำสั่งซื้อ ระบบจริงจะแสดง QR พร้อมเพย์สำหรับสแกนชำระ (เดโม)"}
            {payment === "transfer" && "ระบบจริงจะแสดงเลขบัญชีและช่องแนบสลิปหลังยืนยันคำสั่งซื้อ (เดโม)"}
            {payment === "cod" && "ชำระเงินสดกับพนักงานเมื่อได้รับสินค้า มีค่าบริการเพิ่ม ฿30"}
          </div>
        </Step>
      </div>

      <aside className="lg:sticky lg:top-36 lg:self-start">
        <OrderSummary
          subtotal={subtotal}
          savings={savings}
          shipping={ship}
          shippingLabel={payment === "cod" ? "ค่าจัดส่ง + COD" : "ค่าจัดส่ง"}
          lines={
            <ul className="mb-4 max-h-64 space-y-3 overflow-y-auto border-b border-border pb-4">
              {items.map(({ product, quantity }) => (
                <li key={product.id} className="flex items-center gap-3">
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-art">
                    <Image src={product.images[0]} alt="" fill sizes="56px" className="bg-white object-contain p-1 " />
                    <span className="absolute -right-0 -top-0 grid size-5 place-items-center rounded-bl-lg bg-foreground text-[10px] text-background">
                      {quantity}
                    </span>
                  </span>
                  <span className="line-clamp-2 flex-1 text-sm">{product.name}</span>
                  <span className="text-sm font-medium tabular-nums">{formatBaht(product.price * quantity)}</span>
                </li>
              ))}
            </ul>
          }
        >
          <Button type="submit" size="lg" fullWidth isPending={submitting}>
            {submitting ? "กำลังดำเนินการ..." : `ยืนยันคำสั่งซื้อ · ${formatBaht(subtotal + ship)}`}
          </Button>
          <p className="flex items-start gap-1.5 text-xs text-muted">
            <ShieldIcon size={14} className="mt-0.5 shrink-0" />
            นี่คือเว็บไซต์สาธิต การกดยืนยันจะไม่มีการชำระเงินหรือจัดส่งสินค้าจริง
          </p>
        </OrderSummary>
      </aside>
    </Form>
  );
}

function Confirmation({ order }: { order: Order }) {
  return (
    <div className="mx-auto max-w-2xl animate-fade-up text-center">
      <span className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-success-soft text-success">
        <CheckIcon size={32} strokeWidth={2.4} />
      </span>
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">ขอบคุณสำหรับคำสั่งซื้อ!</h2>
      <p className="mt-2 text-muted">
        หมายเลขคำสั่งซื้อ <span className="font-semibold text-foreground">#{order.id}</span> · คำสั่งซื้อเดโม ไม่มีการเรียกเก็บเงินจริง
      </p>
      <div className="mt-8 rounded-xl border border-border bg-surface p-5 text-left sm:p-6">
        <ul className="space-y-3">
          {order.lines.map((l) => (
            <li key={l.productId} className="flex items-center gap-3">
              <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-art">
                <Image src={l.image} alt="" fill sizes="48px" className="bg-white object-contain p-1 " />
              </span>
              <span className="flex-1 text-sm">
                {l.name} <span className="text-muted">× {l.quantity}</span>
              </span>
              <span className="text-sm font-medium tabular-nums">{formatBaht(l.price * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-5 grid gap-2 border-t border-border pt-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">การจัดส่ง</dt>
            <dd>{order.shippingMethod}</dd>
          </div>
          <div>
            <dt className="text-muted">การชำระเงิน</dt>
            <dd>{order.paymentMethod}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted">ที่อยู่จัดส่ง</dt>
            <dd>{order.address}</dd>
          </div>
          <div className="flex items-baseline justify-between sm:col-span-2">
            <dt className="font-medium">ยอดรวม</dt>
            <dd className="text-xl font-semibold">{formatBaht(order.total)}</dd>
          </div>
        </dl>
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/orders" className={buttonVariants({ size: "lg" })}>
          ดูคำสั่งซื้อของฉัน
        </Link>
        <Link href="/products" className={buttonVariants({ size: "lg", variant: "secondary" })}>
          เลือกซื้อสินค้าต่อ
        </Link>
      </div>
    </div>
  );
}
