"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { CloseIcon, EditIcon, GridIcon, PackageIcon, SearchIcon, StoreIcon, TagIcon } from "@/components/icons";
import { useCatalog } from "@/components/catalog-provider";
import { formatBaht } from "@/lib/format";
import { catalogField } from "./catalog-editor";
import { scrollToField } from "./scroll-to-field";

type Kind = "page" | "category" | "brand" | "product";
type Option = { kind: Kind; href: string; label: string; detail?: string; search: string };

const KINDS: Record<Kind, { label: string; icon: typeof GridIcon }> = {
  page: { label: "หน้าในร้าน", icon: StoreIcon },
  category: { label: "หมวดหมู่", icon: GridIcon },
  brand: { label: "แบรนด์", icon: TagIcon },
  product: { label: "สินค้า", icon: PackageIcon },
};
const PAGES = [
  { href: "/products", label: "สินค้าทั้งหมด" },
  { href: "/products?sale=1", label: "สินค้าลดราคา (Flash Sale)" },
  { href: "/pc-builder", label: "จัดสเปกคอม" },
  { href: "/", label: "หน้าแรก" },
];
const VALID_LINK = /^(\/(?!\/)\S*|https?:\/\/\S+)$/;
const normalize = (text: string) => text.toLocaleLowerCase().normalize("NFKC");

type Props = { name: string; label: string; defaultValue?: string; required?: boolean; emptyLabel?: string };

/** Pick a link destination from the catalogue (search by name) instead of typing a URL. Submits as a hidden input. */
export function LinkPicker({ name, label, defaultValue = "", required, emptyLabel = "เลือกปลายทางของลิงก์" }: Props) {
  const { categories, products, brands, managedBrands } = useCatalog();
  const id = useId();
  const options = useMemo<Option[]>(() => [
    ...PAGES.map((page) => ({ kind: "page" as const, ...page, search: normalize(`${page.label} ${page.href}`) })),
    ...categories.map((category) => ({ kind: "category" as const, href: `/products?category=${category.slug}`, label: category.nameTh, detail: category.name, search: normalize(`${category.nameTh} ${category.name} ${category.slug}`) })),
    ...[...new Set([...managedBrands, ...brands])].sort((a, b) => a.localeCompare(b)).map((brand) => ({ kind: "brand" as const, href: `/products?brand=${encodeURIComponent(brand)}`, label: brand, search: normalize(brand) })),
    ...products.map((product) => ({ kind: "product" as const, href: `/products/${product.slug}`, label: product.name, detail: formatBaht(product.price), search: normalize(`${product.name} ${product.brand} ${product.slug}`) })),
  ], [categories, products, brands, managedBrands]);

  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(() => !!defaultValue && !options.some((option) => option.href === defaultValue));
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [missing, setMissing] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const selected = options.find((option) => option.href === value);

  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const matches = options.filter((option) => terms.every((term) => option.search.includes(term)));
  // Without a search, show a short list per group; typing narrows across everything.
  const perGroup = terms.length ? 30 : 6;
  const groups = (Object.keys(KINDS) as Kind[]).map((kind) => ({ kind, items: matches.filter((option) => option.kind === kind).slice(0, perGroup), total: matches.filter((option) => option.kind === kind).length })).filter((group) => group.items.length);
  const flat = groups.flatMap((group) => group.items);

  function openList() { setOpen(true); setQuery(""); setActive(0); window.setTimeout(() => search.current?.focus({ preventScroll: true }), 0); }
  function choose(option: Option) { setMissing(false); setValue(option.href); setCustom(false); setOpen(false); }
  function keys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") { event.preventDefault(); setActive((index) => Math.min(index + 1, flat.length - 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive((index) => Math.max(index - 1, 0)); }
    else if (event.key === "Enter") { event.preventDefault(); if (flat[active]) choose(flat[active]); }
    else if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); }
  }

  const Icon = selected ? KINDS[selected.kind].icon : EditIcon;
  return <div ref={box} className="text-sm">
    <div className="flex items-center justify-between gap-2"><span id={`${id}-label`} className="font-medium">{label}{required && " *"}</span>
      <button type="button" onClick={() => { setCustom(!custom); setOpen(false); if (custom && !options.some((option) => option.href === value)) setValue(""); }} className="text-xs text-accent hover:underline">{custom ? "เลือกจากรายการ" : "ใส่ลิงก์เอง"}</button>
    </div>
    {custom ? <>
      <input name={name} aria-labelledby={`${id}-label`} value={value} onChange={(event) => setValue(event.target.value)} required={required} maxLength={500} pattern="(/(?!/)\S*|https?://\S+)" className={catalogField} placeholder="/products?category=gpu หรือ https://…" />
      <span className="mt-1 block text-xs text-muted">ขึ้นต้นด้วย / สำหรับหน้าในร้าน หรือ https:// สำหรับเว็บภายนอก</span>
    </> : <>
      {/* Hidden input carries the value; the native required check runs on the visible validator below. */}
      <input type="hidden" name={name} value={value} />
      <input tabIndex={-1} aria-hidden="true" className="sr-only" value={value} onChange={() => {}} required={required} onInvalid={(event) => { event.preventDefault(); setMissing(true); openList(); scrollToField(box.current); }} />
      <div className={`${catalogField} flex items-center gap-2 !py-1.5 ${missing ? "!border-danger ring-2 ring-danger/15" : open ? "border-accent ring-2 ring-accent/15" : ""}`}>
        <button type="button" aria-labelledby={`${id}-label`} aria-expanded={open} aria-controls={`${id}-list`} onClick={() => open ? setOpen(false) : openList()} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
          {value ? <>
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-accent-soft text-accent"><Icon size={15} /></span>
            <span className="min-w-0 flex-1"><span className="block truncate font-medium">{selected?.label ?? value}</span><span className="block truncate text-xs text-muted">{selected && <>{KINDS[selected.kind].label} · </>}<span className="font-mono text-[11px]">{value}</span></span></span>
          </> : <span className="flex-1 py-1 text-muted">{emptyLabel}</span>}
          <SearchIcon size={16} className="shrink-0 text-muted" />
        </button>
        {value && !required && <button type="button" aria-label="ล้างลิงก์" onClick={() => setValue("")} className="rounded p-1 text-muted hover:bg-surface-secondary"><CloseIcon size={14} /></button>}
      </div>
      {missing && <p role="alert" className="mt-1.5 text-sm font-medium text-danger">ยังบันทึกไม่ได้: กรุณาเลือกปลายทางของลิงก์นี้ (คลิกรายการด้านล่าง)</p>}
      {open && <div className="mt-1.5 overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <label className="relative block border-b border-border"><span className="sr-only">ค้นหาปลายทาง</span><SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input ref={search} role="combobox" aria-expanded aria-controls={`${id}-list`} aria-activedescendant={flat[active] ? `${id}-${active}` : undefined} value={query} onChange={(event) => { setQuery(event.target.value); setActive(0); }} onKeyDown={keys} placeholder="ค้นหาหมวดหมู่ สินค้า หรือแบรนด์ เช่น RTX 5070" className="h-10 w-full bg-transparent pl-9 pr-3 outline-none" />
        </label>
        <ul id={`${id}-list`} role="listbox" aria-labelledby={`${id}-label`} className="max-h-72 overflow-y-auto py-1">
          {groups.map((group) => <li key={group.kind} role="presentation">
            <p className="flex items-center justify-between px-3 pb-1 pt-2 text-[11px] font-medium text-muted"><span>{KINDS[group.kind].label}</span>{group.total > group.items.length && <span>แสดง {group.items.length} จาก {group.total} · พิมพ์เพื่อค้นหา</span>}</p>
            <ul role="presentation">{group.items.map((option) => { const index = flat.indexOf(option); const ItemIcon = KINDS[option.kind].icon; return <li key={option.href} id={`${id}-${index}`} role="option" aria-selected={option.href === value} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(option)} onMouseEnter={() => setActive(index)} className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 ${index === active ? "bg-surface-secondary" : ""} ${option.href === value ? "text-accent" : ""}`}>
              <ItemIcon size={15} className="shrink-0 text-muted" /><span className="min-w-0 flex-1 truncate">{option.label}</span>{option.detail && <span className="shrink-0 text-xs text-muted">{option.detail}</span>}
            </li>; })}</ul>
          </li>)}
          {!groups.length && <li className="px-3 py-6 text-center text-muted">ไม่พบรายการ <button type="button" onClick={() => { setCustom(true); setOpen(false); setValue(VALID_LINK.test(query.trim()) ? query.trim() : ""); }} className="text-accent underline">ใส่ลิงก์เอง</button></li>}
        </ul>
      </div>}
    </>}
  </div>;
}
