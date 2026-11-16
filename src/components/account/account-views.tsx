"use client";

import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  FieldError,
  Form,
  Input,
  Label,
  Skeleton,
  TextField,
  buttonVariants,
  toast,
} from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { HeartIcon, LogoutIcon, PackageIcon, UserIcon } from "@/components/icons";
import { ProductGrid } from "@/components/product/product-card";
import { ProductCardSkeleton } from "@/components/catalog/catalog-skeleton";
import { useCatalog } from "@/components/catalog-provider";
import { formatBaht, formatThaiDate } from "@/lib/format";
import { storeActions, useHydrated, useStore } from "@/lib/store";
import type { OrderStatus } from "@/lib/types";

function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action: ReactNode }) {
  return (
    <EmptyState className="rounded-xl border border-dashed border-border bg-surface px-6 py-16">
      <span className="mb-4 grid size-16 place-items-center rounded-lg bg-accent-soft text-accent">{icon}</span>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-1 max-w-sm text-center text-sm text-muted">{text}</p>
      <div className="mt-6">{action}</div>
    </EmptyState>
  );
}

// ---------------------------------------------------------------- wishlist
export function WishlistView() {
  const hydrated = useHydrated();
  const ids = useStore((s) => s.wishlist);
  const { productMap } = useCatalog();
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
      <Empty
        icon={<HeartIcon size={30} />}
        title="ยังไม่มีสินค้าในรายการโปรด"
        text="กดไอคอนหัวใจบนสินค้าที่คุณสนใจ เพื่อบันทึกไว้ดูภายหลัง"
        action={
          <Link href="/products" className={buttonVariants({ size: "lg" })}>
            สำรวจสินค้า
          </Link>
        }
      />
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
const statusMap: Record<OrderStatus, { label: string; color: "accent" | "warning" | "success" }> = {
  processing: { label: "กำลังเตรียมสินค้า", color: "warning" },
  shipped: { label: "กำลังจัดส่ง", color: "accent" },
  delivered: { label: "จัดส่งสำเร็จ", color: "success" },
};

export function OrdersView() {
  const hydrated = useHydrated();
  const orders = useStore((s) => s.orders);
  if (!hydrated) return <Skeleton className="h-48 rounded-xl" />;
  if (orders.length === 0) {
    return (
      <Empty
        icon={<PackageIcon size={30} />}
        title="ยังไม่มีคำสั่งซื้อ"
        text="เมื่อคุณสั่งซื้อสินค้า (เดโม) รายการจะแสดงที่นี่พร้อมสถานะการจัดส่ง"
        action={
          <Link href="/products" className={buttonVariants({ size: "lg" })}>
            เริ่มช้อปปิ้ง
          </Link>
        }
      />
    );
  }
  return (
    <ul className="space-y-4">
      {orders.map((o) => {
        const s = statusMap[o.status];
        return (
          <li key={o.id}>
            <Card className="border border-border p-5">
              <Card.Header className="flex-row flex-wrap items-center justify-between gap-3 p-0">
                <div>
                  <Card.Title className="text-base">คำสั่งซื้อ #{o.id}</Card.Title>
                  <Card.Description>สั่งซื้อเมื่อ {formatThaiDate(o.createdAt)}</Card.Description>
                </div>
                <Chip color={s.color} variant="soft">
                  {s.label}
                </Chip>
              </Card.Header>
              <Card.Content className="mt-4 p-0">
                <div className="flex flex-wrap gap-2">
                  {o.lines.map((l) => (
                    <span key={l.productId} className="relative size-14 overflow-hidden rounded-lg bg-art" title={l.name}>
                      <Image src={l.image} alt={l.name} fill sizes="56px" className="bg-white object-contain p-1 " />
                      {l.quantity > 1 && (
                        <span className="absolute right-0 top-0 rounded-bl-md bg-foreground px-1 text-[10px] text-background">
                          {l.quantity}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
                <ol className="mt-5 grid grid-cols-3 gap-2 text-center text-xs" aria-label="สถานะการจัดส่ง">
                  {(["processing", "shipped", "delivered"] as const).map((st, i) => {
                    const reached = i <= ["processing", "shipped", "delivered"].indexOf(o.status);
                    return (
                      <li key={st} className="space-y-1.5">
                        <span className={`block h-1.5 rounded-full ${reached ? "bg-accent" : "bg-surface-secondary"}`} />
                        <span className={reached ? "text-foreground" : "text-muted"}>{statusMap[st].label}</span>
                      </li>
                    );
                  })}
                </ol>
              </Card.Content>
              <Card.Footer className="mt-4 flex-wrap justify-between gap-2 border-t border-border p-0 pt-4 text-sm">
                <span className="text-muted">
                  {o.lines.reduce((n, l) => n + l.quantity, 0)} ชิ้น · {o.shippingMethod} · {o.paymentMethod}
                </span>
                <span className="font-semibold">{formatBaht(o.total)}</span>
              </Card.Footer>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------- profile
export function ProfileView() {
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

  const stats = [
    { label: "คำสั่งซื้อ", value: orderCount, href: "/orders", icon: PackageIcon },
    { label: "รายการโปรด", value: wishCount, href: "/wishlist", icon: HeartIcon },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card className="h-fit items-center border border-border p-6 text-center">
        <Avatar size="lg" color="accent" variant="soft" className="size-20 text-2xl">
          <Avatar.Fallback>{user.name.slice(0, 1).toUpperCase()}</Avatar.Fallback>
        </Avatar>
        <div>
          <p className="text-lg font-semibold">{user.name}</p>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
        <Chip color="accent" variant="soft" size="sm">
          สมาชิก EDM PC Shop
        </Chip>
        <div className="mt-2 grid w-full grid-cols-2 gap-3">
          {stats.map((s) => (
            <Link key={s.href} href={s.href} className="rounded-xl bg-surface-secondary p-3 transition-colors hover:bg-surface-tertiary">
              <s.icon size={18} className="mx-auto text-accent" />
              <p className="mt-1 text-xl font-semibold">{s.value}</p>
              <p className="text-xs text-muted">{s.label}</p>
            </Link>
          ))}
        </div>
        <Button
          variant="danger-soft"
          fullWidth
          className="mt-2"
          onPress={() => {
            storeActions.signOut();
            toast("ออกจากระบบแล้ว");
            router.push("/");
          }}
        >
          <LogoutIcon size={18} /> ออกจากระบบ
        </Button>
      </Card>

      <Card className="border border-border p-6">
        <Card.Header className="mb-4 p-0">
          <Card.Title>ข้อมูลส่วนตัว</Card.Title>
          <Card.Description>แก้ไขข้อมูลที่ใช้สำหรับการจัดส่ง (บันทึกในเบราว์เซอร์เท่านั้น)</Card.Description>
        </Card.Header>
        <Form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const d = new FormData(e.currentTarget);
            storeActions.updateUser({ name: String(d.get("name")), phone: String(d.get("phone") ?? "") });
            toast.success("บันทึกข้อมูลแล้ว");
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
          <TextField name="email" type="email" isReadOnly defaultValue={user.email} className="sm:col-span-2">
            <Label>อีเมล</Label>
            <Input />
          </TextField>
          <div className="sm:col-span-2">
            <Button type="submit">บันทึกการเปลี่ยนแปลง</Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
