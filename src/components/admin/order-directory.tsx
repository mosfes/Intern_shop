"use client";

import { useAdminFetch } from "./admin-data";

import { Fragment, useEffect, useState } from "react";
import Image from "next/image";
import { Label, ListBox, Modal, Select } from "@heroui/react";
import { ChevronDownIcon, PackageIcon, PrinterIcon, SearchIcon } from "@/components/icons";
import { useFeedback } from "@/components/feedback-provider";
import { formatBaht } from "@/lib/format";
import { MAX_ADMIN_NOTE_LENGTH, MAX_TRACKING_LENGTH, ORDER_STATUSES, ORDER_TRANSITIONS, orderStatusLabel, type AdminOrderList, type AdminOrderRow } from "@/lib/admin-orders";
import type { OrderStatus } from "@/lib/types";
import { AdminPageHeader } from "./user-directory";

const date = (value: string) => new Date(value).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" });
const badge: Record<OrderStatus, string> = {
  processing: "bg-warning-soft text-warning",
  shipped: "bg-accent-soft text-accent",
  delivered: "bg-success-soft text-success",
  cancelled: "bg-danger-soft text-danger",
};
const actionClass = "rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-secondary disabled:opacity-50";
const inputClass = "h-10 w-full rounded-lg border border-[var(--field-border)] bg-[var(--field-background)] px-3 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15";

function StatusBadge({ status, paid = true }: { status: OrderStatus; paid?: boolean }) {
  if (!paid) return <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-warning-soft px-2 py-1 text-xs font-medium text-warning"><span aria-hidden="true" className="size-1.5 rounded-full bg-current" />รอชำระเงิน</span>;
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium ${badge[status] ?? badge.processing}`}><span aria-hidden="true" className="size-1.5 rounded-full bg-current" />{orderStatusLabel[status] ?? status}</span>;
}

export function OrderDirectory({ cache }: { cache: Map<string, AdminOrderList> }) {
  const adminFetch = useAdminFetch("orders");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [status, setStatus] = useState<OrderStatus | "all" | "unpaid">("all");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const key = new URLSearchParams({ page: String(page), status, q: search }).toString();
  const [loaded, setLoaded] = useState<{ key: string; data: AdminOrderList } | null>(null);
  const result = loaded?.key === key ? loaded.data : cache.get(key) ?? null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<AdminOrderRow | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      setError("");
      setLoading(true);
      try {
        const response = await adminFetch(`/api/admin/orders?${key}`, { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (response.status === 401 || response.status === 403) { window.location.replace("/auth/complete"); return; }
        if (!response.ok) throw new Error(data.error || "โหลดคำสั่งซื้อไม่สำเร็จ");
        if (!controller.signal.aborted) {
          if (cache.size >= 12) cache.delete(cache.keys().next().value!);
          cache.set(key, data);
          setLoaded({ key, data });
        }
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "โหลดคำสั่งซื้อไม่สำเร็จ"); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [key, cache, revision, adminFetch]);

  const reload = () => { setRevision((value) => value + 1); };
  const pages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

  return <>
    <AdminPageHeader title="คำสั่งซื้อ" description="ตรวจสอบคำสั่งซื้อและสถานะการชำระเงิน อัปเดตสถานะการจัดส่ง และเลขพัสดุ" />
    <section aria-busy={loading} className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="overflow-x-auto border-b border-border px-4 sm:px-5">
        <div role="group" aria-label="กรองตามสถานะ" className="flex min-w-max gap-5">
          {(["all", ...ORDER_STATUSES, "unpaid"] as const).map((value) => {
            const active = status === value;
            return <button key={value} type="button" disabled={savingId !== null} aria-pressed={active} onClick={() => { setStatus(value); setPage(1); setExpandedId(null); }}
              className={`flex items-center gap-2 border-b-2 py-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-accent ${active ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"}`}>
              {value === "all" ? "ทั้งหมด" : value === "unpaid" ? "รอชำระเงิน" : orderStatusLabel[value]}
              {result && <span className={`min-w-6 rounded-md px-1.5 py-0.5 text-center text-xs tabular-nums ${active ? "bg-accent-soft text-accent" : "bg-surface-secondary text-muted"}`}>{result.counts[value]}</span>}
            </button>;
          })}
        </div>
      </div>
      <form className="flex flex-wrap items-center gap-3 p-4 sm:px-5" role="search" onSubmit={(event) => { event.preventDefault(); if (savingId) return; setSearch(query.trim()); setPage(1); setExpandedId(null); }}>
        <label className="relative min-w-60 flex-1">
          <span className="sr-only">ค้นหาคำสั่งซื้อ</span>
          <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={query} maxLength={100} onChange={(event) => setQuery(event.target.value)} placeholder="เลขคำสั่งซื้อ, รหัสชำระเงิน, ชื่อ, อีเมล หรือเบอร์โทรลูกค้า" className={`${inputClass} pl-9`} />
        </label>
        <button type="submit" disabled={savingId !== null} className={actionClass}>ค้นหา</button>
        {search && <button type="button" disabled={savingId !== null} className={actionClass} onClick={() => { setQuery(""); setSearch(""); setPage(1); setExpandedId(null); }}>ล้าง</button>}
        <button type="button" disabled={savingId !== null} className={actionClass} onClick={reload}>รีเฟรช</button>
      </form>

      {loading && result && <p role="status" className="px-5 pb-3 text-xs text-muted">กำลังอัปเดตคำสั่งซื้อ…</p>}
      {error ? <div role="alert" className="m-4 rounded-lg bg-danger-soft p-4 text-sm text-danger sm:mx-5">{error} <button type="button" className="underline" onClick={reload}>ลองใหม่</button></div>
        : !result ? <p role="status" className="py-12 text-center text-sm text-muted">กำลังโหลดคำสั่งซื้อ…</p>
        : result.orders.length === 0 ? <div className="flex flex-col items-center gap-2 py-14 text-center text-muted"><PackageIcon size={28} /><p>{search ? "ไม่พบคำสั่งซื้อที่ตรงกับคำค้นหา" : "ยังไม่มีคำสั่งซื้อในสถานะนี้"}</p></div>
        : <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-y border-border bg-surface-secondary/50 text-xs text-muted">{["คำสั่งซื้อ", "ลูกค้า", "สินค้า", "การจัดส่ง", "ยอดชำระ", "สถานะ", "จัดการ", "เอกสาร"].map((label) => <th key={label} className="whitespace-nowrap px-4 py-3 font-medium first:pl-5">{label}</th>)}</tr></thead>
              <tbody>{result.orders.map((row) => {
                const items = row.order.lines.reduce((sum, line) => sum + line.quantity, 0);
                const expanded = expandedId === row.id;
                return <Fragment key={row.id}><tr className={`cursor-pointer border-b border-border align-top transition-colors hover:bg-surface-secondary/50 ${expanded ? "bg-accent-soft/30" : ""}`} onClick={() => { if (!savingId) setSelected(row); }}>
                  <td className="whitespace-nowrap px-4 py-3 pl-5"><button type="button" disabled={savingId !== null} className="font-mono font-semibold hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent" onClick={(event) => { event.stopPropagation(); setSelected(row); }}>#{row.order.id}</button><p className="mt-1 text-xs text-muted">{date(row.createdAt)}</p></td>
                  <td className="max-w-56 px-4 py-3"><p className="truncate">{row.customer.name ?? "บัญชีถูกลบ"}</p><p className="truncate text-xs text-muted">{row.customer.email ?? row.customer.id}</p></td>
                  <td className="min-w-48 max-w-72 px-4 py-3"><p className="line-clamp-1">{row.order.lines[0]?.name ?? "—"}</p><p className="text-xs text-muted">{row.order.lines.length > 1 ? `และอีก ${row.order.lines.length - 1} รายการ · ` : ""}{items} ชิ้น</p></td>
                  <td className="whitespace-nowrap px-4 py-3"><p>{row.order.shippingMethod}</p>{row.order.trackingNumber && <p className="font-mono text-xs text-muted">{row.order.trackingNumber}</p>}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums">{formatBaht(row.amount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={row.order.status} paid={row.paid} />{row.order.statusUpdatedAt && row.paid && <p className="mt-1 whitespace-nowrap text-xs text-muted">{date(row.order.statusUpdatedAt)}</p>}</td>
                  <td className="px-4 py-3"><button type="button" disabled={loading || savingId !== null} aria-expanded={expanded} aria-controls={`order-management-${row.id}`} aria-label={`จัดการสถานะคำสั่งซื้อ #${row.order.id}`} onClick={(event) => { event.stopPropagation(); setExpandedId(expanded ? null : row.id); }} className={`${actionClass} inline-flex items-center gap-2 whitespace-nowrap ${expanded ? "border-accent bg-accent-soft text-accent" : ""}`}>จัดการสถานะ<ChevronDownIcon size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} /></button></td>
                  <td className="px-4 py-3"><a href={`/orders/${encodeURIComponent(row.order.id)}/document`} target="_blank" rel="noopener" onClick={(event) => event.stopPropagation()}
                    className={`${actionClass} inline-flex items-center gap-1.5 whitespace-nowrap`}><PrinterIcon size={15} />ใบสั่งซื้อ</a></td>
                </tr>
                  {expanded && <tr id={`order-management-${row.id}`} className="border-b border-border bg-surface-secondary/40"><td colSpan={8} className="p-4 sm:p-5">
                    <div className="sticky left-4 max-w-[calc(100vw-5.25rem)] lg:static lg:max-w-none">
                      <OrderUpdateForm key={`${row.id}-${row.updatedAt}`} row={row} inline onClose={() => setExpandedId(null)} onSavingChange={(saving) => setSavingId(saving ? row.id : null)} onSaved={() => { cache.clear(); setExpandedId(null); reload(); }} />
                    </div>
                  </td></tr>}
                </Fragment>;
              })}</tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm sm:px-5">
            <span className="text-muted">หน้า {result.page} / {pages} · {result.total.toLocaleString("th-TH")} รายการ</span>
            <div className="flex gap-2"><button type="button" className={actionClass} disabled={page <= 1 || savingId !== null} onClick={() => { setPage(page - 1); setExpandedId(null); }}>ก่อนหน้า</button><button type="button" className={actionClass} disabled={page >= pages || savingId !== null} onClick={() => { setPage(page + 1); setExpandedId(null); }}>ถัดไป</button></div>
          </div>
        </>}
    </section>
    {selected && <OrderDialog key={selected.id} row={selected} onClose={() => setSelected(null)} onSaved={() => { cache.clear(); setSelected(null); reload(); }} />}
  </>;
}

function OrderDialog({ row, onClose, onSaved }: { row: AdminOrderRow; onClose: () => void; onSaved: () => void }) {
  const { order } = row;
  const [saving, setSaving] = useState(false);

  return <Modal.Backdrop isOpen onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
    <Modal.Container size="lg" placement="center" scroll="inside">
      <Modal.Dialog className="w-full max-w-[860px] overflow-hidden rounded-2xl bg-overlay p-0 text-foreground shadow-2xl">
        <Modal.CloseTrigger className="text-muted" />
        <Modal.Header className="border-b border-border px-6 py-5 pr-12">
          <Modal.Heading className="flex flex-wrap items-center gap-3 text-lg font-semibold"><span className="font-mono">#{order.id}</span><StatusBadge status={order.status} paid={row.paid} /></Modal.Heading>
          <p className="mt-1 text-sm text-muted">สั่งซื้อ {date(row.createdAt)}{order.statusUpdatedAt && ` · เปลี่ยนสถานะล่าสุด ${date(order.statusUpdatedAt)}`}</p>
          {order.stockIssue && <p role="alert" className="mt-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">รับชำระเงินแล้ว แต่ยังจัดสรรสินค้าไม่ครบ: {order.stockIssue}</p>}
        </Modal.Header>
        <Modal.Body className="m-0 grid gap-6 px-6 py-5 text-sm text-foreground lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-5">
            <ul className="divide-y divide-border rounded-xl border border-border">{order.lines.map((line, index) => <li key={`${line.productId}-${index}`} className="flex items-center gap-3 p-3">
              <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-white">{line.image ? <Image src={line.image} alt="" fill sizes="48px" className="object-contain p-1" /> : <PackageIcon size={18} className="text-muted" />}</span>
              <div className="min-w-0 flex-1"><p className="line-clamp-2 font-medium">{line.name}</p><p className="mt-1 break-all text-xs text-muted">{line.productId} · {line.quantity} ชิ้น × {formatBaht(line.price)}</p></div>
              <span className="shrink-0 font-medium tabular-nums">{formatBaht(line.price * line.quantity)}</span>
            </li>)}</ul>
            <dl className="grid grid-cols-[1fr_auto] gap-2"><dt className="text-muted">ยอดสินค้า</dt><dd className="tabular-nums">{formatBaht(order.subtotal)}</dd>{!!order.discount && <><dt className="text-muted">ส่วนลด{order.discountCode && ` (${order.discountCode})`}</dt><dd className="tabular-nums">−{formatBaht(order.discount)}</dd></>}<dt className="text-muted">ค่าจัดส่ง</dt><dd className="tabular-nums">{order.shipping ? formatBaht(order.shipping) : "ฟรี"}</dd><dt className="border-t border-border pt-2 font-semibold">ยอดชำระ</dt><dd className="border-t border-border pt-2 font-semibold tabular-nums">{formatBaht(row.amount)}</dd></dl>
            <div className="space-y-2 rounded-lg bg-surface-secondary p-4">
              <p><span className="text-muted">ลูกค้า:</span> {row.customer.name ?? "บัญชีถูกลบ"}{row.customer.email && ` · ${row.customer.email}`}{row.customer.phone && ` · ${row.customer.phone}`}</p>
              <p><span className="text-muted">การจัดส่ง:</span> {order.shippingMethod}</p>
              <p className="whitespace-pre-wrap break-words"><span className="text-muted">ที่อยู่:</span> {order.address}</p>
              <p><span className="text-muted">ชำระเงิน:</span> {order.paymentMethod}</p>
              {row.chargeId && <p className="break-all text-xs text-muted">รหัสชำระเงิน: {row.chargeId}</p>}
            </div>
          </div>
          <OrderUpdateForm row={row} onClose={onClose} onSaved={onSaved} onSavingChange={setSaving} />
        </Modal.Body>
      </Modal.Dialog>
    </Modal.Container>
  </Modal.Backdrop>;
}

function OrderUpdateForm({ row, inline = false, onClose, onSaved, onSavingChange }: {
  row: AdminOrderRow;
  inline?: boolean;
  onClose: () => void;
  onSaved: () => void;
  onSavingChange: (saving: boolean) => void;
}) {
  const adminFetch = useAdminFetch("orders");
  const showFeedback = useFeedback();
  const { order } = row;
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [tracking, setTracking] = useState(order.trackingNumber ?? "");
  const [note, setNote] = useState(order.adminNote ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const options = [order.status, ...(ORDER_TRANSITIONS[order.status] ?? [])];
  const changed = status !== order.status || tracking.trim() !== (order.trackingNumber ?? "") || note.trim() !== (order.adminNote ?? "");
  const locked = order.status === "cancelled";

  async function save() {
    if (!row.paid || !changed || saving) return;
    if (status === "cancelled" && order.status !== "cancelled" && !window.confirm(`ยืนยันยกเลิกคำสั่งซื้อ #${order.id}?\nเปลี่ยนกลับไม่ได้ และระบบจะไม่คืนเงินให้อัตโนมัติ กรุณาคืนเงินผ่าน Omise Dashboard`)) return;
    setSaving(true); onSavingChange(true); setError("");
    try {
      const response = await adminFetch("/api/admin/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id, status, trackingNumber: tracking, adminNote: note, updatedAt: row.updatedAt }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "บันทึกไม่สำเร็จ");
      showFeedback({ title: "บันทึกคำสั่งซื้อแล้ว", description: `#${order.id} · ${orderStatusLabel[status]}` });
      onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "บันทึกไม่สำเร็จ"); }
    finally { setSaving(false); onSavingChange(false); }
  }

  if (!row.paid) return <div className="space-y-3 text-sm">
    <h3 className="font-semibold">จัดการสถานะ <span className="font-mono">#{order.id}</span></h3>
    <p className="rounded-lg bg-warning-soft p-3 text-xs text-warning">ลูกค้ายังไม่ได้ชำระเงิน คำสั่งซื้อจะเข้าสู่การจัดส่งเมื่อชำระสำเร็จ จึงยังเปลี่ยนสถานะหรือใส่เลขพัสดุไม่ได้</p>
    <div className="flex flex-wrap gap-2">
      <a href={`/orders/${encodeURIComponent(order.id)}/document`} target="_blank" rel="noopener" className={`${actionClass} inline-flex items-center gap-2`}><PrinterIcon size={16} />ออกใบสั่งซื้อ (รอชำระเงิน)</a>
      <button type="button" onClick={onClose} className={actionClass}>ปิด</button>
    </div>
  </div>;

  return <form aria-label={`จัดการสถานะคำสั่งซื้อ #${order.id}`} aria-busy={saving} className="space-y-4 text-sm" onSubmit={(event) => { event.preventDefault(); void save(); }}>
    <div className="flex flex-wrap items-center gap-3">
      <h3 className="font-semibold">จัดการสถานะ <span className="font-mono">#{order.id}</span></h3>
      <StatusBadge status={order.status} />
      {inline && <span className="text-xs text-muted">{order.statusUpdatedAt ? `เปลี่ยนสถานะล่าสุด ${date(order.statusUpdatedAt)}` : `สั่งซื้อ ${date(row.createdAt)}`}</span>}
    </div>
    <div className={inline ? "grid gap-4 md:grid-cols-3" : "space-y-4"}>
      <div className="space-y-1.5">
        <Select value={status} isDisabled={locked || saving} onChange={(key) => { if (options.includes(key as OrderStatus)) setStatus(key as OrderStatus); }} className="w-full min-w-0">
          <Label className="text-xs text-muted">สถานะคำสั่งซื้อ</Label>
          <Select.Trigger className="min-h-10 w-full rounded-lg"><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>{options.map((value) => {
              const label = `${orderStatusLabel[value]}${value === order.status ? " (ปัจจุบัน)" : ""}`;
              return <ListBox.Item key={value} id={value} textValue={label}>{label}<ListBox.ItemIndicator /></ListBox.Item>;
            })}</ListBox>
          </Select.Popover>
        </Select>
        <p className="text-xs text-muted">เลือกสถานะแล้วกดบันทึกการเปลี่ยนแปลง</p>
      </div>
      <label className="block space-y-1.5"><span className="text-xs text-muted">เลขพัสดุ (ไม่บังคับ)</span>
        <input value={tracking} disabled={locked || saving} maxLength={MAX_TRACKING_LENGTH} pattern="[A-Za-z0-9 \-]*" title="ตัวอักษรอังกฤษ ตัวเลข ช่องว่าง และขีด ไม่เกิน 60 ตัว" onChange={(event) => setTracking(event.target.value)} placeholder="เช่น TH0123456789" className={`${inputClass} font-mono`} />
        <span className="block text-xs text-muted">ลูกค้าจะเห็นเลขนี้ในหน้าคำสั่งซื้อ</span>
      </label>
      <label className="block space-y-1.5"><span className="text-xs text-muted">บันทึกภายใน (ลูกค้าไม่เห็น)</span>
        <textarea value={note} disabled={saving} maxLength={MAX_ADMIN_NOTE_LENGTH} rows={inline ? 2 : 4} onChange={(event) => setNote(event.target.value)} className={`${inputClass} h-auto py-2`} />
        <span className="block text-xs text-muted">{note.length}/{MAX_ADMIN_NOTE_LENGTH} ตัวอักษร</span>
      </label>
    </div>
    {status === "cancelled" && !locked && <p className="rounded-lg bg-warning-soft p-3 text-xs text-warning">การยกเลิกเปลี่ยนกลับไม่ได้และไม่คืนเงินอัตโนมัติ กรุณาคืนเงินผ่าน Omise Dashboard แล้วจดบันทึกไว้ด้านบน</p>}
    {locked && <p className="rounded-lg bg-surface-secondary p-3 text-xs text-muted">คำสั่งซื้อที่ยกเลิกแล้วเปลี่ยนสถานะไม่ได้ แก้ได้เฉพาะบันทึกภายใน</p>}
    {error && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-danger">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <button type="submit" disabled={!changed || saving} className="rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-50">{saving ? "กำลังบันทึก…" : "บันทึกการเปลี่ยนแปลง"}</button>
      <button type="button" disabled={saving} onClick={onClose} className={actionClass}>ปิด</button>
      {!inline && <a href={`/orders/${encodeURIComponent(order.id)}/document`} target="_blank" rel="noopener" className={`${actionClass} inline-flex items-center gap-2`}><PrinterIcon size={16} />ใบสั่งซื้อ</a>}
    </div>
  </form>;
}
