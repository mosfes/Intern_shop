"use client";

import {
  Avatar,
  Badge,
  Button,
  Drawer,
  Dropdown,
  Label,
  Modal,
  Popover,
  SearchField,
  Separator,
  Tooltip,
  buttonVariants,
  useTheme,
} from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import {
  BoltIcon,
  CartIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  HeartIcon,
  Logo,
  LogoutIcon,
  MenuIcon,
  MoonIcon,
  PackageIcon,
  SearchIcon,
  SunIcon,
  UserIcon,
} from "@/components/icons";
import { useCatalog } from "@/components/catalog-provider";
import { scenePhotos } from "@/data/photos";
import { formatBaht } from "@/lib/format";
import { searchProducts } from "@/lib/search";
import { storeActions, useCartCount, useStore } from "@/lib/store";

const iconLink = buttonVariants({ variant: "ghost", isIconOnly: true });

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="hidden bg-foreground text-background sm:block">
        <p className="mx-auto max-w-7xl px-4 py-1.5 text-center text-xs sm:px-6">
          ส่งฟรีเมื่อช้อปครบ ฿3,000
        </p>
      </div>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
        <MobileNav />
        <Link href="/" aria-label="EDM PC Shop หน้าแรก" className="shrink-0">
          <Logo />
        </Link>
        <div className="hidden flex-1 justify-center md:flex">
          <HeaderSearch />
        </div>
        <div className="ml-auto flex items-center gap-0.5 sm:gap-1 md:ml-0">
          <MobileSearch />
          <ThemeToggle />
          <WishlistLink />
          <CartLink />
          <UserMenu />
        </div>
      </div>
      <CategoryBar />
    </header>
  );
}

// ---------------------------------------------------------------- search
function useSubmitSearch() {
  const router = useRouter();
  return (q: string) => {
    const query = q.trim();
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/products");
  };
}

function HeaderSearch({ autoFocus, onDone }: { autoFocus?: boolean; onDone?: () => void }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const submit = useSubmitSearch();
  const { products, categoryMap } = useCatalog();
  const suggestions = query.trim().length >= 2 ? searchProducts(query, products, categoryMap).slice(0, 5) : [];

  return (
    <div className="relative w-full max-w-xl">
      <SearchField
        aria-label="ค้นหาสินค้า"
        value={query}
        onChange={setQuery}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 150)}
        onSubmit={(q) => {
          submit(q);
          setFocused(false);
          onDone?.();
        }}
        fullWidth
      >
        <SearchField.Group className="h-11 rounded-full">
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="ค้นหา CPU, การ์ดจอ, แรม, SSD..." />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
      {focused && suggestions.length > 0 && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-overlay shadow-xl animate-fade-up">
          <ul role="listbox" aria-label="สินค้าที่แนะนำ">
            {suggestions.map((p) => (
              <li key={p.id} role="option" aria-selected={false}>
                <Link
                  href={`/products/${p.slug}`}
                  onClick={() => {
                    setQuery("");
                    onDone?.();
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-secondary"
                >
                  <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-art">
                    <Image src={p.images[0]} alt="" fill sizes="40px" className="object-cover " />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{p.name}</span>
                    <span className="text-xs text-muted">{p.brand}</span>
                  </span>
                  <span className="text-sm font-semibold">{formatBaht(p.price)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              submit(query);
              onDone?.();
            }}
            className="w-full border-t border-border px-4 py-2.5 text-left text-sm font-medium text-accent hover:bg-surface-secondary"
          >
            ดูผลการค้นหาทั้งหมดสำหรับ “{query}”
          </button>
        </div>
      )}
    </div>
  );
}

function MobileSearch() {
  const [isOpen, setOpen] = useState(false);
  return (
    <>
      <Button isIconOnly variant="ghost" aria-label="ค้นหา" className="md:hidden" onPress={() => setOpen(true)}>
        <SearchIcon />
      </Button>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={setOpen}>
        <Modal.Container placement="top" size="full">
          <Modal.Dialog className="rounded-b-3xl">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>ค้นหาสินค้า</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="pb-4">
              <HeaderSearch autoFocus onDone={() => setOpen(false)} />
              <div className="mt-5">
                <p className="mb-2 text-xs font-medium text-muted">คำค้นหายอดนิยม</p>
                <div className="flex flex-wrap gap-2">
                  {["RTX 5070", "Ryzen 7", "DDR5", "Samsung 990", "OLED"].map((t) => (
                    <Link
                      key={t}
                      href={`/search?q=${encodeURIComponent(t)}`}
                      onClick={() => setOpen(false)}
                      className={buttonVariants({ size: "sm", variant: "secondary" })}
                    >
                      {t}
                    </Link>
                  ))}
                </div>
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}

// ---------------------------------------------------------------- actions
const subscribeToHydration = () => () => {};
const getHydratedSnapshot = () => true;
const getServerHydratedSnapshot = () => false;

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme("system");
  // Stored themes are browser-only; keep the initial hydration render equal to SSR.
  const hydrated = useSyncExternalStore(subscribeToHydration, getHydratedSnapshot, getServerHydratedSnapshot);
  const isDark = hydrated && resolvedTheme === "dark";
  const label = isDark ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด";
  return (
    <Tooltip delay={400}>
      <Button isIconOnly variant="ghost" aria-label={label} isDisabled={!hydrated} onPress={() => setTheme(isDark ? "light" : "dark")}>
        <span>{isDark ? <SunIcon /> : <MoonIcon />}</span>
      </Button>
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip>
  );
}

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Badge color="danger" size="sm" placement="top-right">
      {count > 99 ? "99+" : count}
    </Badge>
  );
}

function WishlistLink() {
  const count = useStore((s) => s.wishlist.length);
  return (
    <Link href="/wishlist" aria-label={`รายการโปรด (${count})`} className={`${iconLink} hidden sm:inline-flex`}>
      <Badge.Anchor>
        <HeartIcon />
        <CountBadge count={count} />
      </Badge.Anchor>
    </Link>
  );
}

function CartLink() {
  const count = useCartCount();
  return (
    <Link href="/cart" aria-label={`ตะกร้าสินค้า (${count} ชิ้น)`} className={iconLink}>
      <Badge.Anchor>
        <CartIcon />
        <CountBadge count={count} />
      </Badge.Anchor>
    </Link>
  );
}

function UserMenu() {
  const user = useStore((s) => s.user);
  const router = useRouter();
  if (!user) {
    return (
      <Link href="/login" className={`${buttonVariants({ variant: "primary", size: "sm" })} ml-1 hidden sm:inline-flex`}>
        <UserIcon size={16} />
        เข้าสู่ระบบ
      </Link>
    );
  }
  return (
    <Dropdown>
      <Dropdown.Trigger aria-label="เมนูบัญชีผู้ใช้" className="ml-1 rounded-full">
        <Avatar size="sm" color="accent" variant="soft">
          <Avatar.Fallback>{user.name.slice(0, 1).toUpperCase()}</Avatar.Fallback>
        </Avatar>
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end" className="min-w-56">
        <div className="px-3 pb-2 pt-3">
          <p className="text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
        </div>
        <Separator />
        <Dropdown.Menu
          aria-label="บัญชีผู้ใช้"
          onAction={(key) => {
            if (key === "logout") {
              storeActions.signOut();
              router.push("/");
            } else router.push(`/${String(key)}`);
          }}
        >
          <Dropdown.Item id="profile" textValue="โปรไฟล์ของฉัน">
            <UserIcon size={16} />
            <Label>โปรไฟล์ของฉัน</Label>
          </Dropdown.Item>
          <Dropdown.Item id="orders" textValue="คำสั่งซื้อ">
            <PackageIcon size={16} />
            <Label>คำสั่งซื้อ</Label>
          </Dropdown.Item>
          <Dropdown.Item id="wishlist" textValue="รายการโปรด">
            <HeartIcon size={16} />
            <Label>รายการโปรด</Label>
          </Dropdown.Item>
          <Dropdown.Item id="logout" textValue="ออกจากระบบ" variant="danger">
            <LogoutIcon size={16} />
            <Label>ออกจากระบบ</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

// ---------------------------------------------------------------- categories
function CategoryBar() {
  const { categories } = useCatalog();
  return (
    <nav aria-label="หมวดหมู่สินค้า" className="hidden border-t border-border lg:block">
      <div className="mx-auto flex h-12 max-w-7xl items-center gap-1 px-6">
        <MegaMenu />
        <Separator orientation="vertical" className="mx-2 h-5" />
        {categories.slice(0, 7).map((c) => (
          <Link
            key={c.slug}
            href={`/products?category=${c.slug}`}
            className="rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
          >
            {c.nameTh}
          </Link>
        ))}
        <Link
          href="/products?sale=1"
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-danger transition-colors hover:bg-danger-soft"
        >
          <BoltIcon size={16} />
          Flash Sale
        </Link>
      </div>
    </nav>
  );
}

function MegaMenu() {
  const { categories } = useCatalog();
  const [isOpen, setOpen] = useState(false);
  return (
    <Popover isOpen={isOpen} onOpenChange={setOpen}>
      <Button size="sm" variant="secondary" className="gap-1.5">
        <MenuIcon size={16} />
        หมวดหมู่ทั้งหมด
        <ChevronDownIcon size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </Button>
      <Popover.Content placement="bottom start" offset={10} className="w-[min(880px,calc(100vw-48px))]">
        <Popover.Dialog aria-label="หมวดหมู่สินค้าทั้งหมด" className="p-4">
          <div className="grid grid-cols-[1fr_240px] gap-4">
            <div className="grid grid-cols-2 gap-1">
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/products?category=${c.slug}`}
                  onClick={() => setOpen(false)}
                  className="group flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-surface-secondary"
                >
                  <span className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-white">
                    <Image src={c.image} alt="" fill sizes="64px" className="object-contain p-1.5 transition-transform group-hover:scale-110" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{c.nameTh}</span>
                    <span className="block truncate text-xs text-muted">{c.description}</span>
                  </span>
                </Link>
              ))}
            </div>
            <Link
              href="/products?sale=1"
              onClick={() => setOpen(false)}
              className="group relative flex flex-col justify-end overflow-hidden rounded-xl bg-neutral-950 p-5 text-white"
            >
              <Image
                src={scenePhotos.heroGpu}
                alt=""
                fill
                sizes="240px"
                className="bg-white object-contain p-5 transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent" />
              <span className="relative text-sm font-medium text-orange-400">Flash Sale</span>
              <span className="relative mt-1 text-lg font-semibold leading-snug">การ์ดจอ RTX 50 Series ลดสูงสุด 10%</span>
              <span className="relative mt-3 inline-flex items-center gap-1 text-sm">
                ช้อปเลย <ChevronRightIcon size={14} />
              </span>
            </Link>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

// ---------------------------------------------------------------- mobile
function MobileNav() {
  const { categories } = useCatalog();
  const [isOpen, setOpen] = useState(false);
  const user = useStore((s) => s.user);
  const close = () => setOpen(false);
  const linkCls = "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-surface-secondary";
  return (
    <Drawer isOpen={isOpen} onOpenChange={setOpen}>
      <Button isIconOnly variant="ghost" aria-label="เปิดเมนู" className="lg:hidden">
        <MenuIcon />
      </Button>
      <Drawer.Backdrop>
        <Drawer.Content placement="left">
          <Drawer.Dialog className="w-[86vw] max-w-sm">
            <Drawer.CloseTrigger />
            <Drawer.Header>
              <Drawer.Heading>
                <Logo />
              </Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body className="flex flex-col gap-1">
              {user ? (
                <Link href="/profile" onClick={close} className={`${linkCls} mb-2 bg-surface-secondary`}>
                  <Avatar size="sm" color="accent" variant="soft">
                    <Avatar.Fallback>{user.name.slice(0, 1).toUpperCase()}</Avatar.Fallback>
                  </Avatar>
                  <span>
                    <span className="block font-medium">{user.name}</span>
                    <span className="text-xs text-muted">ดูโปรไฟล์</span>
                  </span>
                </Link>
              ) : (
                <div className="mb-2 grid grid-cols-2 gap-2">
                  <Link href="/login" onClick={close} className={buttonVariants({ variant: "primary" })}>
                    เข้าสู่ระบบ
                  </Link>
                  <Link href="/register" onClick={close} className={buttonVariants({ variant: "secondary" })}>
                    สมัครสมาชิก
                  </Link>
                </div>
              )}
              <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted">หมวดหมู่</p>
              {categories.map((c) => (
                <Link key={c.slug} href={`/products?category=${c.slug}`} onClick={close} className={linkCls}>
                  <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-white">
                    <Image src={c.image} alt="" fill sizes="40px" className="object-contain p-1" />
                  </span>
                  <span className="flex-1">{c.nameTh}</span>
                  <ChevronRightIcon size={16} className="text-muted" />
                </Link>
              ))}
              <Separator className="my-2" />
              <Link href="/products" onClick={close} className={linkCls}>สินค้าทั้งหมด</Link>
              <Link href="/wishlist" onClick={close} className={linkCls}>รายการโปรด</Link>
              <Link href="/orders" onClick={close} className={linkCls}>คำสั่งซื้อของฉัน</Link>
              <Link href="/cart" onClick={close} className={linkCls}>ตะกร้าสินค้า</Link>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
