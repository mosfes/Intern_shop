"use client";

import { Drawer } from "@heroui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ArrowRightIcon, BoltIcon, ChevronDownIcon, GridIcon, ListIcon, PackageIcon, LogoutIcon, ShieldIcon, StoreIcon, TagIcon, UserIcon, UsersIcon } from "@/components/icons";
import { storeActions } from "@/lib/store";
import { SiteHeader } from "@/components/layout/site-header";
import { Container } from "@/components/ui/section";

export type AdminSection = "overview" | "customer" | "admin" | "products" | "categories" | "brands" | "promotions";
export type AdminIdentity = { name: string; email: string; picture?: string | null };

type MenuItem = { id: AdminSection; label: string; icon: typeof GridIcon };
type MenuGroup = { id: string; label: string; icon: typeof GridIcon; children: MenuItem[] };
// Add future sections or groups here. Long menus scroll independently of the workspace.
const menu: (MenuItem | MenuGroup)[] = [
  { id: "overview", label: "ภาพรวม", icon: GridIcon },
  { id: "catalog", label: "จัดการสินค้า", icon: StoreIcon, children: [
    { id: "products", label: "สินค้า", icon: PackageIcon },
    { id: "categories", label: "หมวดหมู่", icon: ListIcon },
    { id: "brands", label: "แบรนด์", icon: TagIcon },
  ] },
  { id: "storefront", label: "หน้าร้าน", icon: GridIcon, children: [
    { id: "promotions", label: "โปรโมชัน", icon: BoltIcon },
  ] },
  { id: "users", label: "จัดการผู้ใช้", icon: UsersIcon, children: [
    { id: "customer", label: "ลูกค้า", icon: UserIcon },
    { id: "admin", label: "แอดมิน", icon: ShieldIcon },
  ] },
];

export function AdminShell({ section, onNavigate, user, children }: { section: AdminSection; onNavigate: (section: AdminSection) => void; user: AdminIdentity; children: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  function navigate(next: AdminSection) { onNavigate(next); setOpen(false); }
  function item(entry: MenuItem, nested = false) {
    const active = section === entry.id;
    return <button key={entry.id} type="button" aria-current={active ? "page" : undefined} onClick={() => navigate(entry.id)} className={`flex w-full items-center gap-2.5 rounded-md px-3 ${nested ? "py-1.5" : "py-2"} text-left text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-accent ${active ? nested ? "bg-accent-soft/70 font-medium text-accent" : "bg-accent font-medium text-white" : "text-muted hover:bg-surface-secondary hover:text-foreground"}`}>
      <entry.icon size={nested ? 15 : 16} /><span>{entry.label}</span>
    </button>;
  }
  const navigation = <div className="flex min-h-0 flex-1 flex-col">
    <nav aria-label="เมนูแอดมิน" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
      <p className="px-3 pb-2 text-[11px] font-medium text-muted">เมนูหลัก</p>
      {menu.map((entry) => "children" in entry ? <details key={entry.id} open className="group">
        <summary className={`flex cursor-pointer list-none items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium [&::-webkit-details-marker]:hidden ${entry.children.some((child) => child.id === section) ? "bg-accent text-white" : "text-foreground hover:bg-surface-secondary"}`}><entry.icon size={16} /><span className="flex-1">{entry.label}</span><ChevronDownIcon size={15} className="transition-transform group-open:rotate-180" /></summary>
        <div className="ml-5 mt-1 space-y-0.5 border-l border-border pl-2">{entry.children.map((child) => item(child, true))}</div>
      </details> : item(entry))}
    </nav>
    <div className="shrink-0 space-y-0.5 border-t border-border p-3">
      <Link href="/" className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-muted hover:bg-surface-secondary hover:text-foreground"><ArrowRightIcon size={16} />กลับหน้าร้าน</Link>
      <button type="button" disabled={signingOut} onClick={async () => { setSigningOut(true); setError(""); try { await storeActions.signOut(); router.push("/login"); router.refresh(); } catch { setError("ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง"); setSigningOut(false); } }} className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-50"><LogoutIcon size={16} />{signingOut ? "กำลังออกจากระบบ…" : "ออกจากระบบ"}</button>
      {error && <p role="alert" className="px-3 text-xs text-danger">{error}</p>}
    </div>
  </div>;
  return <div className="min-h-dvh">
    <SiteHeader variant="admin" onOpenMenu={() => setOpen(true)} adminUser={{ ...user, role: "admin" }} />
    <Drawer isOpen={open} onOpenChange={setOpen}>
      <Drawer.Backdrop><Drawer.Content placement="left"><Drawer.Dialog className="flex h-dvh w-[80vw] max-w-64 flex-col p-0"><Drawer.CloseTrigger /><Drawer.Header className="shrink-0 border-b border-border p-5"><Drawer.Heading>ระบบจัดการร้าน</Drawer.Heading></Drawer.Header><Drawer.Body className="flex min-h-0 flex-1 flex-col p-0">{open && navigation}</Drawer.Body></Drawer.Dialog></Drawer.Content></Drawer.Backdrop>
    </Drawer>
    <Container className="pb-16 pt-8 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start lg:gap-6">
      <aside aria-label="แถบด้านข้าง" className="sticky top-24 hidden max-h-[calc(100dvh-7rem)] flex-col overflow-hidden rounded-xl border border-border bg-surface lg:flex">{navigation}</aside>
      <div className="min-w-0 space-y-6">{children}</div>
    </Container>
  </div>;
}
