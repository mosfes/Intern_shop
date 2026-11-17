"use client";

import {
  Avatar,
  Button,
  Card,
  Chip,
  Description,
  EmptyState,
  FieldError,
  Form,
  Input,
  Label,
  Modal,
  Skeleton,
  TextField,
  buttonVariants,
  toast,
} from "@heroui/react";
import { useFeedback } from "@/components/feedback-provider";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  BankIcon,
  CalendarIcon,
  CashIcon,
  CheckCircleIcon,
  CreditCardIcon,
  ArrowRightIcon,
  HeartIcon,
  LogoutIcon,
  MapPinIcon,
  PackageIcon,
  QrIcon,
  TruckIcon,
  UserIcon,
  CloseIcon,
} from "@/components/icons";
import { CategoryChips } from "@/components/cart/cart-view";
import { ProductGrid } from "@/components/product/product-card";
import { ProductCardSkeleton } from "@/components/catalog/catalog-skeleton";
import { useCatalog } from "@/components/catalog-provider";
import { formatBaht, formatThaiDate } from "@/lib/format";
import { AdminOrderNotice } from "@/components/account/admin-order-notice";
import { AddressBook } from "@/components/account/address-book";
import { AdminTwoFactor } from "@/components/account/admin-two-factor";
import { storeActions, useHydrated, useIsAdmin, useStore } from "@/lib/store";
import type { Order, OrderStatus } from "@/lib/types";

function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action: ReactNode }) {
  return (
    <EmptyState className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
      <span className="mb-4 grid size-16 place-items-center rounded-lg bg-accent-soft text-accent">{icon}</span>
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="mt-1 max-w-sm text-center text-sm text-muted">{text}</p>
      <div className="mt-6">{action}</div>
    </EmptyState>
  );
}

// ---------------------------------------------------------------- wishlist
export function WishlistView() {
  const hydrated = useHydrated();
  const ids = useStore((s) => s.wishlist);
  const { productMap, getProductsByTag, categories } = useCatalog();
  if (!hydrated) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  const items = ids.flatMap((id) => productMap.get(id) ?? []);
  if (items.length === 0) {
    return (
      <div className="space-y-12">
        <section className="flex flex-col items-center rounded-xl border border-border bg-surface px-5 py-10 text-center sm:px-6 sm:py-14">
          <span className="mb-5 grid size-16 place-items-center rounded-xl bg-surface-secondary text-muted">
            <HeartIcon size={30} />
          </span>
          <h2 className="text-xl font-semibold">ยังไม่มีสินค้าในรายการโปรด</h2>
          <p className="mt-1.5 max-w-xl text-sm text-muted">กดไอคอนหัวใจบนสินค้าที่คุณสนใจ เพื่อบันทึกไว้ดูภายหลัง</p>
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
  return (
    <>
      <p className="mb-5 text-sm text-muted">{items.length} รายการ</p>
      <ProductGrid products={items} />
    </>
  );
}

// ---------------------------------------------------------------- orders
const statusMap: Record<OrderStatus, { label: string; color: "accent" | "warning" | "success" | "danger"; icon: typeof PackageIcon }> = {
  processing: { label: "กำลังเตรียมสินค้า", color: "warning", icon: PackageIcon },
  shipped: { label: "กำลังจัดส่ง", color: "accent", icon: TruckIcon },
  delivered: { label: "จัดส่งสำเร็จ", color: "success", icon: CheckCircleIcon },
  cancelled: { label: "ยกเลิกแล้ว", color: "danger", icon: CloseIcon },
};

function paymentIcon(label: string) {
  if (label.includes("พร้อมเพย์")) return QrIcon;
  if (label.includes("โอน")) return BankIcon;
  if (label.includes("ปลายทาง")) return CashIcon;
  return CreditCardIcon;
}

const ORDERS_PER_PAGE = 10;

export function OrdersView() {
  const hydrated = useHydrated();
  const orders = useStore((s) => s.orders);
  const isAdmin = useIsAdmin();
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedOrder = orders.find((order) => order.id === selectedId);
  const filteredOrders = orders
    .filter((order) => status === "all" || order.status === status)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const visibleOrders = filteredOrders.slice((currentPage - 1) * ORDERS_PER_PAGE, currentPage * ORDERS_PER_PAGE);

  useEffect(() => {
    void storeActions.refreshOrders();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void storeActions.refreshOrders();
    }, 15_000);
    return () => window.clearInterval(timer);
  }, []);
  if (!hydrated) return <Skeleton className="h-48 rounded-xl" />;
  if (isAdmin) return <AdminOrderNotice />;
  if (orders.length === 0) {
    return (
      <Empty
        icon={<PackageIcon size={30} />}
        title="ยังไม่มีคำสั่งซื้อ"
        text="เมื่อคุณสั่งซื้อสินค้า รายการจะแสดงที่นี่พร้อมสถานะการจัดส่ง"
        action={<Link href="/products" className={buttonVariants({ size: "lg" })}>เริ่มช้อปปิ้ง</Link>}
      />
    );
  }
  return (
    <div className="space-y-5">
      <section aria-label="รายการคำสั่งซื้อ" className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--surface-shadow)]">
        <div className="overflow-x-auto border-b border-border px-4 sm:px-6">
          <div className="flex min-w-max gap-5 sm:gap-8" role="group" aria-label="กรองคำสั่งซื้อตามสถานะ">
            {(["all", ...STEPS, ...(orders.some((order) => order.status === "cancelled") ? ["cancelled" as const] : [])] as const).map((value) => {
              const count = value === "all" ? orders.length : orders.filter((order) => order.status === value).length;
              const active = status === value;
              return (
                <button key={value} type="button" aria-pressed={active}
                  onClick={() => { setStatus(value); setPage(1); }}
                  className={`relative flex items-center gap-2 border-b-2 py-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-accent ${active ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"}`}>
                  {value === "all" ? "ทั้งหมด" : statusMap[value].label}
                  <span className={`min-w-6 rounded-md px-1.5 py-0.5 text-center text-xs tabular-nums ${active ? "bg-accent-soft text-accent" : "bg-surface-secondary text-muted"}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <p role="status" className="text-sm font-medium">คำสั่งซื้อ <span className="ml-1 font-normal text-muted">{filteredOrders.length} รายการ</span></p>
          <span className="flex items-center gap-1.5 text-xs text-muted"><CalendarIcon size={14} />ล่าสุดก่อน</span>
        </div>
        {visibleOrders.length === 0 ? (
          <div className="px-4 pb-4 sm:px-6 sm:pb-6">
            <Empty icon={<PackageIcon size={30} />} title="ไม่มีคำสั่งซื้อในสถานะนี้"
              text="ลองเลือกสถานะอื่นหรือดูคำสั่งซื้อทั้งหมด"
              action={<Button variant="secondary" onPress={() => { setStatus("all"); setPage(1); }}>ดูทั้งหมด</Button>} />
          </div>
        ) : (
          <>
            <div aria-hidden="true" className="hidden grid-cols-[200px_minmax(0,1fr)_160px_180px] items-center gap-6 border-y border-border bg-surface-secondary/50 px-6 py-3 text-xs text-muted lg:grid">
              <span>คำสั่งซื้อ / วันที่</span><span>สินค้า</span><span>สถานะ</span><span className="pr-14 text-right">ยอดรวม</span>
            </div>
            <ul className="divide-y divide-border">
              {visibleOrders.map((order) => {
                const state = statusMap[order.status];
                const itemCount = order.lines.reduce((sum, line) => sum + line.quantity, 0);
                const firstLine = order.lines[0];
                return (
                  <li key={order.id}>
                    <button type="button" onClick={() => setSelectedId(order.id)}
                      aria-label={`ดูรายละเอียดคำสั่งซื้อ ${order.id}`}
                      className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-4 p-4 text-left transition-colors hover:bg-surface-secondary/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent sm:px-6 lg:grid-cols-[200px_minmax(0,1fr)_160px_180px] lg:gap-6 lg:py-5">
                      <div className="col-span-2 flex min-w-0 items-center justify-between gap-2 lg:col-span-1 lg:block">
                        <p className="truncate text-xs font-medium sm:text-sm" title={`#${order.id}`}>#{order.id}</p>
                        <p className="shrink-0 text-xs text-muted lg:mt-1.5">{formatThaiDate(order.createdAt)}</p>
                      </div>
                      <div className="col-span-2 flex min-w-0 items-center gap-3 lg:col-span-1">
                        <span className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-white">
                          {firstLine?.image ? <Image src={firstLine.image} alt="" fill sizes="56px" className="object-contain p-1.5" /> : <PackageIcon size={22} className="text-muted" />}
                        </span>
                        <div className="min-w-0">
                          <p className="line-clamp-1 text-sm font-medium">{firstLine?.name ?? "รายการสินค้า"}</p>
                          <p className="mt-1 text-xs text-muted">{order.lines.length > 1 ? `และอีก ${order.lines.length - 1} รายการ · ` : ""}{itemCount} ชิ้น</p>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${order.status === "processing" ? "bg-warning-soft text-warning" : order.status === "delivered" ? "bg-success-soft text-success" : order.status === "cancelled" ? "bg-danger-soft text-danger" : "bg-accent-soft text-accent"}`}>
                          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />{state.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-3 lg:gap-5">
                        <p className="text-right text-base font-semibold tabular-nums">{formatBaht(order.total)}</p>
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted transition-colors group-hover:border-accent/30 group-hover:text-accent lg:size-9">
                          <span className="sr-only">ดูรายละเอียด</span><ArrowRightIcon size={16} />
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
      {totalPages > 1 && <nav aria-label="หน้าคำสั่งซื้อ" className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-muted">หน้า {currentPage} จาก {totalPages}</span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" isDisabled={currentPage <= 1} onPress={() => setPage(currentPage - 1)}>ก่อนหน้า</Button>
          <Button variant="secondary" size="sm" isDisabled={currentPage >= totalPages} onPress={() => setPage(currentPage + 1)}>ถัดไป</Button>
        </div>
      </nav>}
      <Modal.Backdrop isOpen={!!selectedOrder} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <Modal.Container size="lg" placement="center" scroll="inside" className="sm:w-full sm:max-w-[976px]">
          <Modal.Dialog className="w-full max-w-4xl overflow-hidden rounded-2xl bg-overlay p-0 text-foreground">
            <Modal.CloseTrigger aria-label="ปิดรายละเอียดคำสั่งซื้อ" />
            <Modal.Header className="border-b border-border px-5 py-4 pr-12">
              <Modal.Heading>รายละเอียดคำสั่งซื้อ</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="m-0 p-0">
              {selectedOrder && <OrderDetails order={selectedOrder} />}
            </Modal.Body>
            <Modal.Footer className="border-t border-border px-5 py-3">
              <Button variant="secondary" onPress={() => setSelectedId(null)}>ปิด</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}

function OrderDetails({ order: o }: { order: Order }) {
  const { productMap } = useCatalog();
  const s = statusMap[o.status];
  const StatusIcon = s.icon;
  const PayIcon = paymentIcon(o.paymentMethod);
  const itemCount = o.lines.reduce((n, l) => n + l.quantity, 0);
  const stepIndex = (STEPS as readonly OrderStatus[]).indexOf(o.status);
  return (
    <Card className="overflow-hidden rounded-none border-0 p-0 shadow-none">
      {/* header band */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-secondary/60 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
            <PackageIcon size={22} />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-muted">หมายเลขคำสั่งซื้อ</p>
            <p className="break-all font-mono text-base font-semibold tracking-wide">#{o.id}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <span className="flex items-center gap-1.5 text-muted">
            <CalendarIcon size={15} />
            {formatThaiDate(o.createdAt)}
          </span>
          <Chip color={s.color} variant="soft" className="px-3 py-1.5 text-sm font-semibold">
            <span className="flex items-center gap-1.5">
              <StatusIcon size={16} />
              {s.label}
            </span>
          </Chip>
        </div>
      </div>

      {o.trackingNumber && (
        <p className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3 text-sm sm:px-6">
          <TruckIcon size={16} className="text-muted" />
          <span className="text-muted">เลขพัสดุ</span>
          <span className="font-mono font-semibold tracking-wide">{o.trackingNumber}</span>
        </p>
      )}

      {/* progress stepper */}
      {o.status === "cancelled" ? (
        <p role="status" className="mx-5 my-5 rounded-lg bg-danger-soft p-4 text-sm text-danger sm:mx-6">คำสั่งซื้อนี้ถูกยกเลิกโดยร้านค้า หากมีข้อสงสัยเรื่องการคืนเงิน กรุณาติดต่อร้าน</p>
      ) : <ol className="relative grid grid-cols-3 px-5 pb-5 pt-6 sm:px-6" aria-label="สถานะการจัดส่ง">
        {STEPS.map((st, i) => {
          const reached = i <= stepIndex;
          const current = i === stepIndex;
          const StepIcon = statusMap[st].icon;
          return (
            <li key={st} className="relative flex flex-col items-center text-center" aria-current={current ? "step" : undefined}>
              {i > 0 && (
                <span
                  aria-hidden
                  className={`absolute right-1/2 top-5 h-1 w-full -translate-y-1/2 rounded-full ${i <= stepIndex ? "bg-accent" : "bg-surface-tertiary"}`}
                />
              )}
              <span
                className={`relative z-10 grid size-10 place-items-center rounded-full border-2 transition-colors ${
                  reached ? "border-accent bg-accent text-accent-foreground" : "border-surface-tertiary bg-surface text-muted"
                } ${current ? "ring-4 ring-accent/20" : ""}`}
              >
                <StepIcon size={18} />
              </span>
              <span className={`mt-2.5 text-xs sm:text-sm ${reached ? "font-semibold text-foreground" : "text-muted"}`}>
                {statusMap[st].label}
              </span>
            </li>
          );
        })}
      </ol>}

      <div className="grid gap-5 border-t border-border p-5 sm:p-6 lg:grid-cols-[1fr_320px]">
        {/* items */}
        <div className="min-w-0">
          <h3 className="mb-3 text-sm font-semibold">
            รายการสินค้า <span className="font-normal text-muted">({itemCount} ชิ้น)</span>
          </h3>
          <ul className="space-y-3">
            {o.lines.map((l) => {
              const slug = productMap.get(l.productId)?.slug;
              const name = slug ? (
                <Link href={`/products/${slug}`} className="break-words font-medium hover:text-accent">
                  {l.name}
                </Link>
              ) : (
                <span className="break-words font-medium">{l.name}</span>
              );
              return (
                <li key={l.productId} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3">
                  <span className="relative size-16 shrink-0 sm:size-20 overflow-hidden rounded-lg bg-white">
                    <Image src={l.image} alt={l.name} fill sizes="80px" className="object-contain p-1.5" />
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    {name}
                    <p className="mt-1.5 text-xs text-muted">
                      {formatBaht(l.price)} × {l.quantity} ชิ้น
                    </p>
                  </div>
                  <span className="ml-auto shrink-0 text-base font-semibold">{formatBaht(l.price * l.quantity)}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* summary */}
        <aside className="flex flex-col gap-4 rounded-xl bg-surface-secondary p-4">
          <dl className="space-y-3 text-sm">
            <InfoRow icon={TruckIcon} label="การจัดส่ง" value={o.shippingMethod} />
            <InfoRow icon={PayIcon} label="การชำระเงิน" value={o.paymentMethod} />
            {o.address && <InfoRow icon={MapPinIcon} label="ที่อยู่จัดส่ง" value={o.address} />}
          </dl>
          <div className="space-y-1.5 border-t border-border pt-4 text-sm">
            <div className="flex justify-between text-muted">
              <span>ราคาสินค้า ({itemCount} ชิ้น)</span>
              <span>{formatBaht(o.subtotal)}</span>
            </div>
            {!!o.discount && (
              <div className="flex justify-between text-success">
                <span>โค้ดส่วนลด{o.discountCode ? ` (${o.discountCode})` : ""}</span>
                <span>-{formatBaht(o.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted">
              <span>ค่าจัดส่ง</span>
              <span className={o.shipping === 0 ? "font-medium text-success" : ""}>
                {o.shipping === 0 ? "ฟรี" : formatBaht(o.shipping)}
              </span>
            </div>
            <div className="flex items-baseline justify-between pt-2">
              <span className="font-semibold">ยอดรวมทั้งหมด</span>
              <span className="text-xl font-semibold text-accent">{formatBaht(o.total)}</span>
            </div>
          </div>
        </aside>
      </div>
    </Card>
  );
}

const STEPS = ["processing", "shipped", "delivered"] as const satisfies readonly OrderStatus[];

function InfoRow({ icon: Icon, label, value }: { icon: typeof PackageIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface text-muted">
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted">{label}</dt>
        <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- profile
export function ProfileView() {
  const showFeedback = useFeedback();
  const hydrated = useHydrated();
  const user = useStore((s) => s.user);
  const orderCount = useStore((s) => s.orders.length);
  const wishCount = useStore((s) => s.wishlist.length);
  const router = useRouter();

  if (!hydrated) return <Skeleton className="h-64 rounded-xl" />;
  if (!user) {
    return (
      <Empty
        icon={<UserIcon size={30} />}
        title="กรุณาเข้าสู่ระบบ"
        text="เข้าสู่ระบบ (เดโม) เพื่อดูและแก้ไขข้อมูลโปรไฟล์ของคุณ"
        action={
          <div className="flex gap-3">
            <Link href="/login" className={buttonVariants({ size: "lg" })}>
              เข้าสู่ระบบ
            </Link>
            <Link href="/register" className={buttonVariants({ size: "lg", variant: "secondary" })}>
              สมัครสมาชิก
            </Link>
          </div>
        }
      />
    );
  }

  // Admins manage the store and don't shop, so order / wishlist counts don't apply to them.
  const stats = user.role === "admin" ? [] : [
    { label: "คำสั่งซื้อ", value: orderCount, href: "/orders", icon: PackageIcon },
    { label: "รายการโปรด", value: wishCount, href: "/wishlist", icon: HeartIcon },
  ];

  return (
    <div className={`grid gap-6 lg:grid-cols-[320px_1fr] ${user.role === "admin" ? "xl:grid-cols-[300px_minmax(0,1fr)_320px]" : ""}`}>
      <Card className="items-center border border-border p-6 text-center">
        <Avatar size="lg" color="accent" variant="soft" className="size-20 text-2xl">
          {user.picture && <Avatar.Image src={user.picture} alt="" referrerPolicy="no-referrer" />}
          <Avatar.Fallback>{user.name.slice(0, 1).toUpperCase()}</Avatar.Fallback>
        </Avatar>
        <div>
          <p className="text-lg font-semibold">{user.name}</p>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
        <Chip color="accent" variant="soft" size="sm">
          {user.role === "admin" ? "แอดมิน" : "ลูกค้า EDM PC Shop"}
        </Chip>
        {stats.length > 0 && <div className="mt-2 grid w-full grid-cols-2 gap-3">
          {stats.map((s) => (
            <Link key={s.href} href={s.href} className="rounded-xl bg-surface-secondary p-3 transition-colors hover:bg-surface-tertiary">
              <s.icon size={18} className="mx-auto text-accent" />
              <p className="mt-1 text-xl font-semibold">{s.value}</p>
              <p className="text-xs text-muted">{s.label}</p>
            </Link>
          ))}
        </div>}
        {user.role !== "admin" && <Button
          variant="danger-soft"
          fullWidth
          className="mt-auto"
          onPress={async () => {
            try {
              await storeActions.signOut();
              toast("ออกจากระบบแล้ว");
              router.push("/");
            } catch {
              toast.danger("ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง");
            }
          }}
        >
          <LogoutIcon size={18} /> ออกจากระบบ
        </Button>}
      </Card>

      <Card className="border border-border p-6">
        <Card.Header className="mb-4 p-0">
          <Card.Title>ข้อมูลส่วนตัว</Card.Title>
          <Card.Description>แก้ไขข้อมูลที่ใช้สำหรับการจัดส่ง (บันทึกในเบราว์เซอร์เท่านั้น)</Card.Description>
        </Card.Header>
        <Form
          className="grid flex-1 gap-4 sm:grid-cols-2 sm:grid-rows-[auto_auto_1fr]"
          onSubmit={(e) => {
            e.preventDefault();
            const d = new FormData(e.currentTarget);
            storeActions.updateUser({ name: String(d.get("name")), phone: String(d.get("phone") ?? "") });
            showFeedback({ title: "บันทึกข้อมูลสำเร็จ", description: "อัปเดตข้อมูลส่วนตัวในเบราว์เซอร์นี้เรียบร้อยแล้ว" });
          }}
        >
          <TextField name="name" isRequired defaultValue={user.name}>
            <Label>ชื่อที่แสดง</Label>
            <Input />
            <FieldError>กรุณากรอกชื่อ</FieldError>
          </TextField>
          <TextField name="phone" type="tel" defaultValue={user.phone}>
            <Label>เบอร์โทรศัพท์</Label>
            <Input placeholder="08x-xxx-xxxx" />
          </TextField>
          <TextField name="email" type="email" isReadOnly isDisabled defaultValue={user.email} className="sm:col-span-2">
            <Label>อีเมล</Label>
            <Input className="cursor-not-allowed bg-default/60 text-muted" />
            <Description>อีเมลใช้เข้าสู่ระบบ ไม่สามารถแก้ไขได้</Description>
          </TextField>
          <div className="flex justify-end self-end border-t border-border pt-4 sm:col-span-2">
            <Button type="submit">บันทึกการเปลี่ยนแปลง</Button>
          </div>
        </Form>
      </Card>
      {user.role !== "admin" && user.googleId && <AddressBook user={user} className="lg:col-start-2" />}
      {user.role === "admin" && <AdminTwoFactor className="lg:col-span-2 xl:col-span-1" />}
    </div>
  );
}
