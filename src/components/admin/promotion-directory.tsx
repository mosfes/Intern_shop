"use client";

import { useAdminDataState, useAdminFetch } from "./admin-data";

import { Chip, Modal } from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChevronDownIcon, EditIcon, EyeIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { useFeedback } from "@/components/feedback-provider";
import { PROMOTION_PLACEMENTS, PROMOTION_VISIBLE, type Promotion, type PromotionPlacement } from "@/lib/promotions";
import { catalogPrimary } from "./catalog-editor";
import { AdminLinkCatalog } from "./admin-link-catalog";
import { PromotionEditor } from "./promotion-editor";
import { AdminContentSkeleton } from "./admin-skeleton";
import { AdminPageHeader } from "./user-directory";

async function read(response: Response) {
  if (response.status === 401 || response.status === 403) { window.location.replace("/auth/complete"); throw new Error("กรุณาตรวจสอบสิทธิ์การใช้งาน"); }
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "ดำเนินการไม่สำเร็จ กรุณาลองอีกครั้ง");
  return result;
}

export function PromotionDirectory() {
  const adminFetch = useAdminFetch("promotions");
  const send = (method: string, body: unknown) => adminFetch("/api/admin/promotions", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(read);
  const router = useRouter(); const feedback = useFeedback();
  const [rows, setRows] = useAdminDataState<Promotion[]>("promotions");
  const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  const [editor, setEditor] = useState<{ promotion: Promotion | null; placement: PromotionPlacement } | null>(null);
  const [deleting, setDeleting] = useState<Promotion | null>(null); const [deleteError, setDeleteError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try { setRows((await read(await adminFetch("/api/admin/promotions", { cache: "no-store" }))).promotions); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "โหลดข้อมูลไม่สำเร็จ"); }
  }, [adminFetch, setRows]);
  useEffect(() => { const timer = window.setTimeout(() => { void refresh(); }, 0); return () => window.clearTimeout(timer); }, [refresh]);

  async function run(work: () => Promise<void>, failure = "ดำเนินการไม่สำเร็จ") {
    setPending(true); setError("");
    try { await work(); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : failure); }
    finally { setPending(false); }
  }

  async function save(body: Record<string, unknown>): Promise<string | null> {
    setPending(true);
    try {
      const { promotion } = await send(editor?.promotion ? "PUT" : "POST", body);
      setRows((current) => current && [...current.filter((row) => row.id !== promotion.id), promotion]);
      router.refresh(); feedback({ title: "บันทึกโปรโมชันแล้ว", description: "หน้าแรกอัปเดตเรียบร้อยแล้ว" }); return null;
    } catch (cause) { return cause instanceof Error ? cause.message : "บันทึกไม่สำเร็จ"; }
    finally { setPending(false); }
  }

  const move = (list: Promotion[], index: number, offset: number) => run(async () => {
    const ids = list.map((row) => row.id);
    [ids[index], ids[index + offset]] = [ids[index + offset], ids[index]];
    setRows((current) => current && current.map((row) => ids.includes(row.id) ? { ...row, position: ids.indexOf(row.id) } : row));
    try { setRows((await send("PATCH", { action: "reorder", placement: list[0].placement, ids })).promotions); }
    catch (cause) { await refresh(); throw cause; }
  });

  async function remove() {
    if (!deleting) return; setPending(true); setDeleteError("");
    try {
      await send("DELETE", { id: deleting.id });
      setRows((current) => current && current.filter((row) => row.id !== deleting.id));
      setDeleting(null); router.refresh(); feedback({ title: "ลบโปรโมชันแล้ว", description: "นำออกจากหน้าแรกเรียบร้อยแล้ว" });
    } catch (cause) { setDeleteError(cause instanceof Error ? cause.message : "ลบไม่สำเร็จ"); }
    finally { setPending(false); }
  }

  if (!rows && !error) return <AdminContentSkeleton section="promotions" />;
  return <div className="space-y-6">
    <AdminPageHeader title="จัดการโปรโมชัน" description="แก้ไขสไลด์ การ์ด และแบนเนอร์โปรโมชันที่หน้าแรกของร้าน" action={<div className="flex gap-2"><Link href="/" target="_blank" className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface-secondary"><EyeIcon size={17} />ดูหน้าแรก</Link></div>} />
    {error && <p role="alert" className="rounded-lg bg-danger-soft p-4 text-sm text-danger">{error}<button type="button" onClick={() => void refresh()} className="ml-3 underline">โหลดใหม่</button></p>}
    {rows && PROMOTION_PLACEMENTS.map((placement) => {
      const list = rows.filter((row) => row.placement === placement.id).sort((a, b) => a.position - b.position);
      const shown = new Set(list.filter((row) => row.active).slice(0, PROMOTION_VISIBLE[placement.id]).map((row) => row.id));
      const full = list.length >= placement.limit;
      return <section key={placement.id} aria-labelledby={`promo-${placement.id}`} className="overflow-hidden rounded-xl border border-border bg-surface">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div><h2 id={`promo-${placement.id}`} className="font-semibold">{placement.label} <span className="ml-1 text-sm font-normal text-muted">{list.length}/{placement.limit}</span></h2><p className="mt-0.5 text-xs text-muted">{placement.description}</p></div>
          {full ? <span className="text-xs text-muted">ครบ {placement.limit} รายการแล้ว · แก้ไขหรือลบรายการเดิมแทน</span> : <button type="button" disabled={pending} onClick={() => setEditor({ promotion: null, placement: placement.id })} className={`${catalogPrimary} px-3 py-2`}><PlusIcon size={16} />เพิ่ม{placement.label}</button>}
        </header>
        {!list.length ? <p className="px-6 py-10 text-center text-sm text-muted">ยังไม่มีรายการ ส่วนนี้จะถูกซ่อนจากหน้าแรก</p> : <ol className="divide-y divide-border">{list.map((row, index) => <li key={row.id} className={`flex flex-wrap items-center gap-4 px-5 py-4 sm:flex-nowrap ${row.active ? "" : "bg-surface-secondary/40"}`}>
          <div className="flex flex-col gap-0.5"><button type="button" aria-label={`เลื่อน ${row.title} ขึ้น`} disabled={pending || index === 0} onClick={() => void move(list, index, -1)} className="rounded p-1 text-muted hover:bg-surface-secondary disabled:opacity-25"><ChevronDownIcon size={16} className="rotate-180" /></button><button type="button" aria-label={`เลื่อน ${row.title} ลง`} disabled={pending || index === list.length - 1} onClick={() => void move(list, index, 1)} className="rounded p-1 text-muted hover:bg-surface-secondary disabled:opacity-25"><ChevronDownIcon size={16} /></button></div>
          <span className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-border ${row.placement === "SIDE" && row.theme === "dark" ? "bg-[#20252d]" : row.placement === "SIDE" ? "bg-[#f7f0e9]" : "bg-white"}`}><Image src={row.image} alt="" fill sizes="96px" className="object-contain p-1.5" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">{row.tag && <span className="text-xs font-medium text-accent">{row.tag}</span>}{shown.has(row.id) ? <Chip size="sm" color="success" variant="soft">แสดงอยู่</Chip> : row.active ? <Chip size="sm" color="warning" variant="soft">เกินจำนวนที่แสดง</Chip> : <Chip size="sm" color="default" variant="soft">ซ่อน</Chip>}</div>
            <p className="mt-1 truncate font-medium">{row.title}{row.highlight && <span className="text-accent"> · {row.highlight}</span>}</p>
            <p className="truncate font-mono text-xs text-muted">{row.ctaHref}</p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button type="button" disabled={pending} aria-label={`แก้ไข ${row.title}`} onClick={() => setEditor({ promotion: row, placement: row.placement })} className="rounded-lg p-2 text-muted hover:bg-accent-soft hover:text-accent disabled:opacity-50"><EditIcon size={17} /></button>
            <button type="button" disabled={pending} aria-label={`ลบ ${row.title}`} onClick={() => { setDeleting(row); setDeleteError(""); }} className="rounded-lg p-2 text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-30"><TrashIcon size={17} /></button>
          </div>
        </li>)}</ol>}
      </section>;
    })}
    {editor && <AdminLinkCatalog onClose={() => setEditor(null)}><PromotionEditor promotion={editor.promotion} placement={editor.placement} pending={pending} onSave={save} onClose={() => setEditor(null)} /></AdminLinkCatalog>}
    <Modal.Backdrop isOpen={!!deleting} onOpenChange={(open) => { if (!open && !pending) setDeleting(null); }}><Modal.Container size="sm" placement="center"><Modal.Dialog className="rounded-2xl bg-overlay p-0 text-foreground"><Modal.CloseTrigger isDisabled={pending} /><Modal.Header className="px-6 pt-6"><Modal.Heading>ลบโปรโมชัน</Modal.Heading></Modal.Header><Modal.Body className="px-6 py-4"><p className="break-words text-sm">ต้องการลบ <strong>{deleting?.title}</strong> หรือไม่?</p><p className="mt-2 text-xs text-muted">หากต้องการซ่อนชั่วคราว ให้ปิดสวิตช์แสดงผลแทน</p>{deleteError && <p role="alert" className="mt-3 text-sm text-danger">{deleteError}</p>}</Modal.Body><Modal.Footer className="flex justify-end gap-4 border-t border-border px-6 py-4"><button type="button" disabled={pending} onClick={() => setDeleting(null)} className="text-sm text-muted">ยกเลิก</button><button type="button" disabled={pending} onClick={() => void remove()} className="rounded-lg bg-danger px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "กำลังลบ…" : "ยืนยันลบ"}</button></Modal.Footer></Modal.Dialog></Modal.Container></Modal.Backdrop>
  </div>;
}
