"use client";

import {
  Button,
  Checkbox,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  Radio,
  RadioGroup,
  Skeleton,
  TextArea,
  TextField,
  buttonVariants,
} from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { CHECKOUT_LOGIN_HREF } from "@/lib/auth-redirect";
import { CartSkeleton } from "@/components/cart/cart-view";
import { OrderSummary } from "@/components/cart/order-summary";
import { ShippingAddressFields } from "@/components/checkout/shipping-address-fields";
import { BankIcon, CartIcon, CheckIcon, CreditCardIcon, QrIcon, ShieldIcon } from "@/components/icons";
import { useCatalog } from "@/components/catalog-provider";
import { useAddressBook } from "@/lib/address-book";
import { formatAddressLine, type SavedAddress } from "@/lib/addresses";
import { formatBaht, shippingCost, shippingOptions, type ShippingId } from "@/lib/format";
import { CardFields, createCardToken } from "@/components/checkout/card-fields";
import { BankSelect } from "@/components/checkout/bank-select";
import { DiscountCodeField } from "@/components/checkout/discount-code-field";
import { AdminOrderNotice } from "@/components/account/admin-order-notice";
import { cartDetails, useCartLines, useHydrated, useIsAdmin, useStore } from "@/lib/store";
import { MOBILE_BANKS, type PaymentMethod } from "@/lib/payments";
import { savePendingPayment } from "@/lib/pending-payment";
import type { Order } from "@/lib/types";

const paymentChoices = [
  { id: "card", label: "บัตรเครดิต / เดบิต", description: "Visa, Mastercard, JCB", icon: CreditCardIcon },
  { id: "promptpay", label: "พร้อมเพย์ QR", description: "สแกนจ่ายผ่านแอปธนาคาร", icon: QrIcon },
  { id: "mobile", label: "Mobile Banking", description: "เปิดแอปธนาคารบนมือถือเพื่อจ่าย", icon: BankIcon },
] as const;
type PaymentChoice = (typeof paymentChoices)[number]["id"];


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

/** `omisePublicKey` is Omise's browser-safe key (pkey_…); without it payments are switched off. */
export function CheckoutView({ omisePublicKey }: { omisePublicKey: string }) {
  const paymentsEnabled = !!omisePublicKey;
  const omiseTestMode = omisePublicKey.startsWith("pkey_test_");
  const hydrated = useHydrated();
  const lines = useCartLines();
  const user = useStore((s) => s.user);
  const isAdmin = useIsAdmin();
  const { productMap } = useCatalog();
  const { selectedItems: items, subtotal, savings } = cartDetails(lines, productMap);
  const [shipping, setShipping] = useState<ShippingId>("standard");
  const [payment, setPayment] = useState<PaymentChoice>("promptpay");
  const [bank, setBank] = useState<(typeof MOBILE_BANKS)[number]["id"]>(MOBILE_BANKS[0].id);
  const [payError, setPayError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // A code applies to one subtotal; if the cart changes underneath, it must be applied again.
  const [applied, setApplied] = useState<{ code: string; discount: number; subtotal: number } | null>(null);
  const [codeError, setCodeError] = useState("");
  // "new" = type an address by hand; otherwise the id of a saved address that fills the form.
  const [pickedId, setPickedId] = useState<string | "new" | null>(null);
  const [saveForLater, setSaveForLater] = useState(true);
  const book = useAddressBook(hydrated && !isAdmin ? user?.googleId ?? null : null);
  const router = useRouter();
  const mustSignIn = hydrated && !user;

  // Until the customer chooses, start from the default saved address (or the first one).
  const saved = book.addresses;
  const activeId = pickedId ?? (saved ? (saved.length === 0 ? "new" : (saved.find((a) => a.isDefault) ?? saved[0]).id) : null);

  // Signed-out visitors may fill a cart but can't order: send them to log in, then back here.
  useEffect(() => {
    if (mustSignIn) router.replace(CHECKOUT_LOGIN_HREF);
  }, [mustSignIn, router]);

  if (!hydrated) return <CartSkeleton />;
  if (isAdmin) return <AdminOrderNotice />;
  if (!user) {
    return (
      <div role="status" className="rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
        <h2 className="text-xl font-semibold">กรุณาเข้าสู่ระบบก่อนสั่งซื้อ</h2>
        <p className="mt-1 text-sm text-muted">กำลังพาไปหน้าเข้าสู่ระบบ สินค้าในตะกร้าของคุณจะยังอยู่ครบ</p>
        <Link href={CHECKOUT_LOGIN_HREF} className={`${buttonVariants()} mt-6`}>
          เข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
        <span className="mx-auto mb-4 grid size-16 place-items-center rounded-lg bg-accent-soft text-accent">
          <CartIcon size={30} />
        </span>
        <h2 className="text-xl font-semibold">ไม่มีสินค้าสำหรับชำระเงิน</h2>
        <p className="mt-1 text-sm text-muted">เลือกสินค้าในตะกร้าที่ต้องการสั่งซื้อก่อนดำเนินการชำระเงิน</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/cart" className={buttonVariants()}>
            กลับไปที่ตะกร้า
          </Link>
          <Link href="/products" className={buttonVariants({ variant: "secondary" })}>
            เลือกซื้อสินค้า
          </Link>
        </div>
      </div>
    );
  }

  const picked = saved?.find((a) => a.id === activeId);
  const ship = shippingCost(shipping, subtotal);
  const coupon = applied && applied.subtotal === subtotal ? applied : null;
  const discount = coupon?.discount ?? 0;
  const payable = subtotal - discount + ship;

  return (
    <Form
      className="grid gap-8 lg:grid-cols-[1fr_380px]"
      onSubmit={async (e) => {
        e.preventDefault();
        if (submitting) return;
        const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
        const method: PaymentMethod = payment === "mobile" ? bank : payment;
        setSubmitting(true);
        setPayError("");
        try {
          // Card details go from these inputs straight to Omise, which returns a one-time token for our server.
          const token = payment === "card" ? await createCardToken(omisePublicKey) : undefined;
          const response = await fetch("/api/payments/charge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              method,
              token,
              lines: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
              shipping,
              discountCode: coupon?.code,
              address: {
                fullName: data.fullName, phone: data.phone, address: data.address,
                province: data.province, district: data.district, subdistrict: data.subdistrict, postcode: data.postcode,
              },
            }),
          });
          const result = await response.json().catch(() => ({}));
          if (response.status === 401) { router.replace(CHECKOUT_LOGIN_HREF); return; }
          if (!response.ok) {
            // A code that stopped working is dropped so the customer sees the real total again.
            if (coupon && /โค้ด/.test(result.error ?? "")) { setApplied(null); setCodeError(result.error); }
            throw new Error(result.error || "ชำระเงินไม่สำเร็จ กรุณาลองอีกครั้ง");
          }
          // The order is saved with the payment so it can be completed after the redirect; the server's
          // amounts replace ours so the order always matches what was charged.
          const order: Order = result.order;
          savePendingPayment({ chargeId: result.chargeId, order });
          if (activeId === "new" && saveForLater) {
            // Best effort: a failure here is not shown as an error.
            const duplicate = (saved ?? []).some((a) => formatAddressLine(a) === formatAddressLine({ address: data.address, district: data.district, subdistrict: data.subdistrict, province: data.province, postcode: data.postcode }) && a.fullName === data.fullName);
            if (!duplicate) {
              void book.add({ label: "", fullName: data.fullName, phone: data.phone, address: data.address, province: data.province, district: data.district, subdistrict: data.subdistrict, postcode: data.postcode });
            }
          }
          // Banks and 3-D Secure take the customer away to approve; everything else waits on our status page.
          if (result.authorizeUri) window.location.assign(result.authorizeUri);
          else router.push("/checkout/complete");
        } catch (error) {
          setPayError(error instanceof Error ? error.message : "ชำระเงินไม่สำเร็จ กรุณาลองอีกครั้ง");
          setSubmitting(false);
        }
      }}
    >
      <div className="min-w-0 space-y-5">
        <Step n={1} title="ข้อมูลการจัดส่ง">
          {saved === null && user.googleId && (
            <div role="status" aria-label="กำลังโหลดที่อยู่ที่บันทึกไว้" className="mb-5 space-y-2">
              <p className="text-sm text-muted">กำลังโหลดที่อยู่ที่บันทึกไว้...</p>
              <Skeleton className="h-24 rounded-xl" />
            </div>
          )}
          {book.failed && <p role="alert" className="mb-4 text-sm text-danger">โหลดที่อยู่ที่บันทึกไว้ไม่สำเร็จ <Button type="button" size="sm" variant="ghost" onPress={() => { void book.reload(); }}>ลองอีกครั้ง</Button></p>}
          {saved && saved.length > 0 && (
            <SavedAddressPicker addresses={saved} value={activeId} onChange={setPickedId} />
          )}
          <fieldset disabled={saved === null && !!user.googleId} key={activeId ?? "loading"} className="grid min-w-0 gap-4 sm:grid-cols-2">
            <TextField name="fullName" isRequired defaultValue={picked?.fullName ?? user?.name} autoComplete="name">
              <Label>ชื่อ-นามสกุล</Label>
              <Input placeholder="สมชาย ใจดี" />
              <FieldError>กรุณากรอกชื่อผู้รับ</FieldError>
            </TextField>
            <TextField name="phone" type="tel" isRequired defaultValue={picked?.phone ?? user?.phone} autoComplete="tel" pattern="[0-9\- ]{9,12}">
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
            <TextField name="address" isRequired defaultValue={picked?.address} className="sm:col-span-2" autoComplete="street-address">
              <Label>ที่อยู่</Label>
              <TextArea placeholder="บ้านเลขที่ อาคาร ถนน" rows={2} />
              <FieldError>กรุณากรอกที่อยู่</FieldError>
            </TextField>
            <ShippingAddressFields defaults={picked ? { province: picked.province, district: picked.district, subdistrict: picked.subdistrict, postcode: picked.postcode } : undefined} />
            {activeId === "new" && book.addresses !== null && !book.failed && (
              <Checkbox isSelected={saveForLater} onChange={setSaveForLater} className="sm:col-span-2">
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <Checkbox.Content>
                  <Label>บันทึกที่อยู่นี้ไว้ใช้ในครั้งต่อไป</Label>
                </Checkbox.Content>
              </Checkbox>
            )}
          </fieldset>
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
            onChange={(v) => setPayment(v as PaymentChoice)}
            className="grid gap-3 sm:grid-cols-2"
          >
            {paymentChoices.map((m) => (
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
          {payment === "card" && <CardFields publicKey={omisePublicKey} disabled={submitting || !paymentsEnabled} />}
          {payment === "mobile" && (
            <BankSelect value={bank} onChange={setBank} isDisabled={submitting} />
          )}
          <div className="mt-4 rounded-xl border border-dashed border-border bg-surface-secondary/60 p-4 text-sm text-muted">
            {payment === "card" && "ข้อมูลบัตรส่งตรงถึง Omise ผู้ให้บริการชำระเงิน ร้านไม่เก็บเลขบัตรของคุณ บางบัตรอาจต้องยืนยันตัวตน (3-D Secure) กับธนาคาร"}
            {payment === "promptpay" && "หลังกดยืนยัน ระบบจะแสดง QR พร้อมเพย์ให้สแกนจ่ายผ่านแอปธนาคาร QR มีอายุ 30 นาที"}
            {payment === "mobile" && "หลังกดยืนยัน ระบบจะพาไปเปิดแอปธนาคารที่เลือกเพื่ออนุมัติการชำระเงิน แล้วกลับมาที่ร้านอัตโนมัติ"}
          </div>
          {!paymentsEnabled && <p role="alert" className="mt-3 text-sm text-danger">ระบบชำระเงินยังไม่เปิดใช้งาน (ยังไม่ได้ตั้งค่า Omise)</p>}
        </Step>
      </div>

      <aside className="lg:sticky lg:top-36 lg:self-start">
        <OrderSummary
          subtotal={subtotal}
          savings={savings}
          shipping={ship}
          discount={discount}
          discountCode={coupon?.code}
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
          <DiscountCodeField
            subtotal={subtotal}
            applied={coupon}
            error={codeError}
            disabled={submitting}
            onApply={(next) => { setApplied(next); setCodeError(""); }}
            onRemove={() => { setApplied(null); setCodeError(""); }}
            onError={setCodeError}
          />
          {payError && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{payError}</p>}
          <Button type="submit" size="lg" fullWidth isPending={submitting} isDisabled={!paymentsEnabled || (saved === null && !!user.googleId)}>
            {submitting ? "กำลังดำเนินการ..." : `ชำระเงิน · ${formatBaht(payable)}`}
          </Button>
          <p className="flex items-start gap-1.5 text-xs text-muted">
            <ShieldIcon size={14} className="mt-0.5 shrink-0" />
            {omiseTestMode ? "โหมดทดสอบ: ใช้บัตรทดสอบของ Omise เท่านั้น ไม่มีการเรียกเก็บเงินจริง" : "ชำระเงินอย่างปลอดภัยผ่าน Omise"}
          </p>
        </OrderSummary>
      </aside>
    </Form>
  );
}

function SavedAddressPicker({
  addresses,
  value,
  onChange,
}: {
  addresses: SavedAddress[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium">ที่อยู่ที่บันทึกไว้</p>
        <Link href="/profile" className="text-sm text-accent hover:text-foreground">
          จัดการที่อยู่
        </Link>
      </div>
      <RadioGroup aria-label="เลือกที่อยู่จัดส่ง" value={value ?? ""} onChange={onChange} className="gap-3">
        {addresses.map((a) => (
          <Radio key={a.id} value={a.id} className={radioCard}>
            <Radio.Content className="w-full">
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              <div className="min-w-0 flex-1">
                <Label className="cursor-pointer font-medium">
                  {a.label || a.fullName}
                  {a.isDefault && <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-normal text-accent">ค่าเริ่มต้น</span>}
                </Label>
                <p className="text-xs text-muted">
                  {a.fullName} · {a.phone}
                </p>
                <p className="text-xs text-muted">{formatAddressLine(a)}</p>
              </div>
            </Radio.Content>
          </Radio>
        ))}
        <Radio value="new" className={radioCard}>
          <Radio.Content className="w-full">
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            <Label className="cursor-pointer font-medium">ใช้ที่อยู่ใหม่</Label>
          </Radio.Content>
        </Radio>
      </RadioGroup>
    </div>
  );
}

export function Confirmation({ order }: { order: Order }) {
  return (
    <div className="mx-auto max-w-2xl animate-fade-up text-center">
      <span className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-success-soft text-success">
        <CheckIcon size={32} strokeWidth={2.4} />
      </span>
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">ขอบคุณสำหรับคำสั่งซื้อ!</h2>
      <p className="mt-2 text-muted">
        หมายเลขคำสั่งซื้อ <span className="font-semibold text-foreground">#{order.id}</span>
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
