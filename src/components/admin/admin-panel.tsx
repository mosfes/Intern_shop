"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BoltIcon, ChevronRightIcon, PackageIcon, ShieldIcon, TagIcon, TruckIcon, UserIcon } from "@/components/icons";
import { AdminShell, type AdminIdentity, type AdminSection } from "./admin-shell";
import type { AdminOrderList } from "@/lib/admin-orders";
import { storeActions } from "@/lib/store";
import { useFeedback } from "@/components/feedback-provider";
import { Avatar, Chip } from "@heroui/react";

import { AdminDataProvider, useAdminDataState, useAdminFetch } from "./admin-data";
import { ActivityDirectory } from "./activity-directory";
import { OrderDirectory } from "./order-directory";
import { ProductDirectory } from "./product-directory";
import { CatalogDirectory } from "./catalog-directory";
import { FlashSaleDirectory } from "./flash-sale-directory";
import { PromotionDirectory } from "./promotion-directory";
import { DiscountCodeDirectory } from "./discount-code-directory";
import { AdminContentSkeleton } from "./admin-skeleton";
import { SalesOverview } from "./sales-overview";
import { AdminPageHeader, UserDirectory, type Directory } from "./user-directory";

export function AdminPanel({ user }: { user: AdminIdentity }) {
  return <AdminDataProvider key={user.email}><AdminPanelContent user={user} /></AdminDataProvider>;
}

function AdminPanelContent({ user }: { user: AdminIdentity }) {
  const adminFetch = useAdminFetch("users");
  const orderCache = useMemo(() => ({ account: user.email, pages: new Map<string, AdminOrderList>() }), [user.email]);
  const [data, setData] = useAdminDataState<Directory>("users");
  const searchParams = useSearchParams();
  const section = searchParams.get("section");
  const tab: AdminSection = section === "logs" || section === "orders" || section === "customer" || section === "admin" || section === "products" || section === "categories" || section === "brands" || section === "flash-sale" || section === "promotions" || section === "discounts" ? section : "overview";
  const [error, setError] = useState("");
  const showFeedback = useFeedback();
  const [pending, setPending] = useState(false);

  function navigate(next: AdminSection) {
    if (next === tab) return;
    const url = new URL(window.location.href);
    if (next === "overview") url.searchParams.delete("section");
    else url.searchParams.set("section", next);
    window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  const refresh = useCallback(async () => {
    const response = await adminFetch("/api/admin/users", { cache: "no-store" });
    const result = await response.json();
    if (response.status === 401 || response.status === 403) { window.location.replace("/auth/complete"); return; }
    if (!response.ok) throw new Error(result.error);
    setData(result);
  }, [adminFetch, setData]);
  useEffect(() => { if (tab === "logs" || tab === "orders" || tab === "products" || tab === "categories" || tab === "brands" || tab === "flash-sale" || tab === "promotions" || tab === "discounts") return; const timer = window.setTimeout(() => { void refresh().catch(() => setError("โหลดข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง")); }, 0); return () => window.clearTimeout(timer); }, [refresh, tab]);

  async function mutate(body: Record<string, unknown>) {
    setPending(true); setError("");
    try {
      const response = await adminFetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      // Keep the result visible even when resetting this session's own password.
      if (body.action === "setCredentials" || body.action === "addAdmin") return true;
      const session = await adminFetch("/api/auth/session", { cache: "no-store" });
      if (!session.ok) throw new Error("ตรวจสอบสิทธิ์ไม่สำเร็จ กรุณาโหลดหน้าใหม่");
      const { user } = await session.json();
      storeActions.syncGoogleUser(user);
      if (user?.role !== "admin") { window.location.replace(user ? "/profile" : "/login"); return true; }
      await refresh();
      showFeedback({ title: "บันทึกสำเร็จ", description: "อัปเดตข้อมูลและสิทธิ์การใช้งานเรียบร้อยแล้ว" });
      return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "บันทึกไม่สำเร็จ"); return false; }
    finally { setPending(false); }
  }

  async function credentialsClosed() {
    try {
      const response = await adminFetch("/api/auth/session", { cache: "no-store" });
      if (!response.ok) throw new Error("ตรวจสอบสิทธิ์ไม่สำเร็จ กรุณาโหลดหน้าใหม่");
      const { user } = await response.json();
      storeActions.syncGoogleUser(user);
      if (user?.role !== "admin") { window.location.replace(user ? "/profile" : "/login"); return; }
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "โหลดข้อมูลไม่สำเร็จ"); }
  }

  if (tab === "logs") return <AdminShell section={tab} onNavigate={navigate} user={user}><ActivityDirectory /></AdminShell>;
  if (tab === "orders") return <AdminShell section={tab} onNavigate={navigate} user={user}><OrderDirectory key={orderCache.account} cache={orderCache.pages} /></AdminShell>;
  if (tab === "products") return <AdminShell section={tab} onNavigate={navigate} user={user}><ProductDirectory /></AdminShell>;
  if (tab === "flash-sale") return <AdminShell section={tab} onNavigate={navigate} user={user}><FlashSaleDirectory /></AdminShell>;
  if (tab === "promotions") return <AdminShell section={tab} onNavigate={navigate} user={user}><PromotionDirectory /></AdminShell>;
  if (tab === "discounts") return <AdminShell section={tab} onNavigate={navigate} user={user}><DiscountCodeDirectory /></AdminShell>;
  if (tab === "categories" || tab === "brands") return <AdminShell section={tab} onNavigate={navigate} user={user}><CatalogDirectory key={tab} kind={tab === "categories" ? "category" : "brand"} /></AdminShell>;

  const customers = data?.users.filter((user) => user.role === "customer") ?? [];
  return (
    <AdminShell section={tab} onNavigate={navigate} user={user}>
      {tab === "overview" && <AdminPageHeader title="ภาพรวมระบบ" description="ยอดขาย คำสั่งซื้อ สินค้า และบัญชีของร้านในที่เดียว" />}
      {tab === "overview" && <section className="flex items-center gap-4 rounded-xl border border-border bg-surface p-5 sm:p-6" aria-label="ยินดีต้อนรับ">
        <Avatar size="lg" color="accent" variant="soft" className="size-14 shrink-0 text-xl">{user.picture && <Avatar.Image src={user.picture} alt="" referrerPolicy="no-referrer" />}<Avatar.Fallback>{user.name.charAt(0).toUpperCase()}</Avatar.Fallback></Avatar>
        <div className="min-w-0 flex-1"><p className="text-sm text-muted">ยินดีต้อนรับกลับ</p><h2 className="truncate text-xl font-semibold">{user.name}</h2><p className="truncate text-sm text-muted">{user.email}</p></div>
        <Chip size="sm" color="accent" variant="soft" className="hidden sm:inline-flex">แอดมิน</Chip>
      </section>}
      {error && <div role="alert" className="rounded-lg bg-danger-soft p-4 text-danger">{error} <button className="underline" onClick={() => refresh().then(() => setError("")).catch(() => setError("โหลดข้อมูลไม่สำเร็จ"))}>ลองใหม่</button></div>}
      {tab === "overview" && <SalesOverview onNavigate={navigate} />}
      {!data ? (error ? null : <AdminContentSkeleton section={tab} includeHeading={tab !== "overview"} />) : tab === "overview" ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {([
              { title: "ลูกค้าทั้งหมด", value: customers.length, detail: "ดูและแก้ไขข้อมูลลูกค้า", section: "customer", icon: UserIcon },
              { title: "แอดมินทั้งหมด", value: data.admins.length, detail: "จัดการรายชื่อและสิทธิ์แอดมิน", section: "admin", icon: ShieldIcon },
              { title: "ลูกค้าที่ถูกระงับ", value: customers.filter((account) => account.disabled).length, detail: "ตรวจสอบสถานะบัญชีลูกค้า", section: "customer", icon: ShieldIcon },
            ] as const).map((card) => <button key={card.title} onClick={() => navigate(card.section)} className="flex items-center gap-4 rounded-xl border border-border bg-surface p-5 text-left transition-[box-shadow,border-color] hover:border-accent/40 hover:shadow-[var(--card-hover-shadow)] focus-visible:outline-2 focus-visible:outline-accent"><span className="grid size-12 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent"><card.icon size={23} /></span><span className="min-w-0 flex-1"><span className="block text-sm text-muted">{card.title}</span><span className="mt-1 block text-2xl font-semibold tabular-nums">{card.value}</span><span className="mt-1 block text-xs text-muted">{card.detail}</span></span><ChevronRightIcon size={17} className="shrink-0 text-muted" /></button>)}
          </div>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">บัญชีที่เข้าสู่ระบบล่าสุด</h2><button className="text-sm text-accent hover:underline" onClick={() => navigate("customer")}>จัดการลูกค้า</button></div>
              {data.users.length === 0 ? <p className="py-8 text-center text-sm text-muted">ยังไม่มีบัญชีที่เข้าสู่ระบบ</p> : <ul className="mt-4 divide-y divide-border">{[...data.users].sort((a, b) => new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime()).slice(0, 5).map((account) => <li key={account.googleId} className="flex flex-wrap items-center gap-3 py-4"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-secondary text-muted"><UserIcon size={18} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{account.name}</p><p className="truncate text-xs text-muted">{account.email}</p></div><div className="text-right"><p className="text-xs text-muted">{new Date(account.lastLogin).toLocaleDateString("th-TH")}</p><p className="mt-1 text-xs text-accent">{account.role === "admin" ? "แอดมิน" : "ลูกค้า"}</p></div></li>)}</ul>}
            </section>
            <section className="rounded-xl border border-border bg-surface p-5 sm:p-6"><h2 className="text-lg font-semibold">ทางลัดการจัดการ</h2><div className="mt-4 space-y-2">{([
              { section: "orders", label: "จัดการคำสั่งซื้อ", description: "อัปเดตสถานะการจัดส่งและเลขพัสดุ", icon: TruckIcon },
              { section: "products", label: "จัดการสินค้า", description: "สินค้า ราคา และจำนวนคงเหลือ", icon: PackageIcon },
              { section: "promotions", label: "จัดการโปรโมชัน", description: "สไลด์ การ์ด และแบนเนอร์หน้าแรก", icon: BoltIcon },
              { section: "flash-sale", label: "จัดการแฟลชเซล", description: "เลือกสินค้าและแก้ไขราคาแฟลชเซลหน้าแรก", icon: BoltIcon },
              { section: "discounts", label: "โค้ดส่วนลด", description: "สร้างโค้ดให้ลูกค้ากรอกตอนชำระเงิน", icon: TagIcon },
              { section: "customer", label: "จัดการลูกค้า", description: "ข้อมูลติดต่อและสถานะบัญชี", icon: UserIcon },
              { section: "admin", label: "จัดการแอดมิน", description: "เพิ่มหรือถอดสิทธิ์ด้วยอีเมล", icon: ShieldIcon },
            ] as const).map((shortcut) => <button key={shortcut.section} onClick={() => navigate(shortcut.section)} className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-surface-secondary"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-secondary text-muted"><shortcut.icon size={20} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{shortcut.label}</span><span className="mt-1 block text-xs text-muted">{shortcut.description}</span></span><ChevronRightIcon size={16} className="text-muted" /></button>)}</div></section>
          </div>
        </div>
      ) : <UserDirectory key={tab} data={data} adminsOnly={tab === "admin"} pending={pending} mutate={mutate} onCredentialsClose={() => { void credentialsClosed(); }} />}
    </AdminShell>
  );
}
