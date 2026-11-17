"use client";

import { useAdminDataState, useAdminFetch } from "./admin-data";

import { Modal } from "@heroui/react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { EditIcon, PlusIcon, TagIcon, TrashIcon } from "@/components/icons";
import { useFeedback } from "@/components/feedback-provider";
import { describeDiscount, expiryDay, type DiscountCode, type DiscountType } from "@/lib/discount-codes";
import { formatBaht } from "@/lib/format";
import { catalogField, catalogPrimary } from "./catalog-editor";
import { AdminContentSkeleton } from "./admin-skeleton";
import { AdminPageHeader } from "./user-directory";

async function read(response: Response) {
  if (response.status === 401 || response.status === 403) { window.location.replace("/auth/complete"); throw new Error("กรุณาตรวจสอบสิทธิ์การใช้งาน"); }
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "ดำเนินการไม่สำเร็จ กรุณาลองอีกครั้ง");
  return result;
}
const randomCode = () => `EDM${Array.from(crypto.getRandomValues(new Uint8Array(5)), (n) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[n % 32]).join("")}`;
const today = () => expiryDay(new Date());
const status = (code: DiscountCode) => !code.active ? "ปิดใช้งาน" : code.expiresAt && code.expiresAt < today() ? "หมดอายุ" : code.usageLimit !== null && code.usedCount >= code.usageLimit ? "ใช้ครบแล้ว" : "ใช้งานได้";

export function DiscountCodeDirectory() {
  const adminFetch = useAdminFetch("discounts");
  const send = (method: string, body: unknown) => adminFetch("/api/admin/discount-codes", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(read);
  const feedback = useFeedback();
  const [codes, setCodes] = useAdminDataState<DiscountCode[]>("discounts");
  const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  const [editor, setEditor] = useState<{ record: DiscountCode | null } | null>(null);
  const [deleting, setDeleting] = useState<DiscountCode | null>(null); const [deleteError, setDeleteError] = useState("");
  const refresh = useCallback(async () => {
    setError("");
    try { setCodes((await read(await adminFetch("/api/admin/discount-codes", { cache: "no-store" }))).codes); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "โหลดข้อมูลไม่สำเร็จ"); }
  }, [adminFetch, setCodes]);
  useEffect(() => { const timer = window.setTimeout(() => { void refresh(); }, 0); return () => window.clearTimeout(timer); }, [refresh]);

  const upsert = (code: DiscountCode) => setCodes((current) => current && [code, ...current.filter((row) => row.code !== code.code)].sort((a, b) => a.code.localeCompare(b.code)));
  async function save(body: Record<string, unknown>, creating: boolean): Promise<string | null> {
    setPending(true);
    try { upsert((await send(creating ? "POST" : "PUT", body)).code); feedback({ title: "บันทึกโค้ดแล้ว", description: `โค้ด ${body.code} พร้อมใช้งาน` }); return null; }
    catch (cause) { return cause instanceof Error ? cause.message : "บันทึกไม่สำเร็จ"; }
    finally { setPending(false); }
  }
  async function toggle(code: DiscountCode) {
    setPending(true);
    try { upsert((await send("PATCH", { code: code.code, active: !code.active })).code); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "เปลี่ยนสถานะไม่สำเร็จ"); }
    finally { setPending(false); }
  }
  async function remove() {
    if (!deleting) return; setPending(true); setDeleteError("");
    try { await send("DELETE", { code: deleting.code }); setCodes((current) => current && current.filter((row) => row.code !== deleting.code)); setDeleting(null); feedback({ title: "ลบโค้ดแล้ว", description: "นำโค้ดออกจากรายการเรียบร้อยแล้ว" }); }
    catch (cause) { setDeleteError(cause instanceof Error ? cause.message : "ลบไม่สำเร็จ"); }
    finally { setPending(false); }
  }

  if (!codes && !error) return <AdminContentSkeleton section="promotions" />;
  const rows = codes ?? [];
  return <div className="space-y-6">
    <AdminPageHeader title="โค้ดส่วนลด" description="สร้างโค้ดให้ลูกค้ากรอกตอนชำระเงินเพื่อรับส่วนลด" action={<button type="button" disabled={!codes || pending} onClick={() => setEditor({ record: null })} className={catalogPrimary}><PlusIcon size={18} />สร้างโค้ด</button>} />
    {error && <p role="alert" className="rounded-lg bg-danger-soft p-4 text-sm text-danger">{error}<button type="button" onClick={() => void refresh()} className="ml-3 underline">ลองใหม่</button></p>}
    <div className="grid grid-cols-2 gap-3"><div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-5"><TagIcon className="text-accent" /><div><p className="text-xs text-muted">โค้ดทั้งหมด</p><p className="mt-1 text-2xl font-semibold">{rows.length}</p></div></div><div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-5"><TagIcon className="text-success" /><div><p className="text-xs text-muted">ใช้งานได้ตอนนี้</p><p className="mt-1 text-2xl font-semibold">{rows.filter((row) => status(row) === "ใช้งานได้").length}</p></div></div></div>
    <section aria-label="รายการโค้ดส่วนลด" className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="whitespace-nowrap border-b border-border bg-surface-secondary/50 text-xs text-muted"><tr><th scope="col" className="px-5 py-4">โค้ด</th><th scope="col" className="px-4 py-4">ส่วนลด</th><th scope="col" className="px-4 py-4">ขั้นต่ำ</th><th scope="col" className="px-4 py-4">ใช้แล้ว</th><th scope="col" className="px-4 py-4">หมดอายุ</th><th scope="col" className="px-4 py-4">สถานะ</th><th scope="col" className="px-4 py-4 text-right">จัดการ</th></tr></thead><tbody className="divide-y divide-border">{rows.map((row) => { const state = status(row); return <tr key={row.code} className="hover:bg-surface-secondary/40">
        <td className="px-5 py-4 font-mono text-sm font-semibold">{row.code}</td>
        <td className="whitespace-nowrap px-4 py-4">{describeDiscount(row)}</td>
        <td className="whitespace-nowrap px-4 py-4 tabular-nums">{row.minSubtotal ? formatBaht(row.minSubtotal) : "ไม่มี"}</td>
        <td className="whitespace-nowrap px-4 py-4 tabular-nums">{row.usedCount}{row.usageLimit !== null ? ` / ${row.usageLimit}` : ""}</td>
        <td className="whitespace-nowrap px-4 py-4">{row.expiresAt ?? "ไม่มีวันหมดอายุ"}</td>
        <td className="px-4 py-4"><button type="button" disabled={pending} aria-pressed={row.active} aria-label={`${row.active ? "ปิด" : "เปิด"}ใช้งานโค้ด ${row.code}`} onClick={() => void toggle(row)} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium disabled:opacity-50 ${state === "ใช้งานได้" ? "bg-success/15 text-success" : "bg-surface-secondary text-muted"}`}>{state}</button></td>
        <td className="px-4 py-4"><div className="flex items-center justify-end gap-1"><button type="button" disabled={pending} aria-label={`แก้ไขโค้ด ${row.code}`} onClick={() => setEditor({ record: row })} className="rounded-lg p-2 text-muted hover:bg-accent-soft hover:text-accent disabled:opacity-50"><EditIcon size={17} /></button><button type="button" disabled={pending} aria-label={`ลบโค้ด ${row.code}`} onClick={() => { setDeleting(row); setDeleteError(""); }} className="rounded-lg p-2 text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-50"><TrashIcon size={17} /></button></div></td>
      </tr>; })}</tbody></table>{!rows.length && <p className="px-6 py-12 text-center text-sm text-muted">ยังไม่มีโค้ดส่วนลด กด “สร้างโค้ด” เพื่อเริ่มต้น</p>}</div>
    </section>
    {editor && <DiscountCodeEditor record={editor.record} pending={pending} onSave={save} onClose={() => setEditor(null)} />}
    <Modal.Backdrop isOpen={!!deleting} onOpenChange={(open) => { if (!open && !pending) setDeleting(null); }}><Modal.Container size="sm" placement="center"><Modal.Dialog className="rounded-2xl bg-overlay p-0 text-foreground"><Modal.CloseTrigger isDisabled={pending} /><Modal.Header className="px-6 pt-6"><Modal.Heading>ลบโค้ดส่วนลด</Modal.Heading></Modal.Header><Modal.Body className="px-6 py-4"><p className="break-words text-sm">ต้องการลบโค้ด <strong className="font-mono">{deleting?.code}</strong> หรือไม่?</p><p className="mt-2 text-xs text-muted">ลูกค้าจะใช้โค้ดนี้ไม่ได้อีก หากแค่ต้องการหยุดชั่วคราวให้กดปิดใช้งานแทน</p>{deleteError && <p role="alert" className="mt-3 text-sm text-danger">{deleteError}</p>}</Modal.Body><Modal.Footer className="flex justify-end gap-4 border-t border-border px-6 py-4"><button type="button" disabled={pending} onClick={() => setDeleting(null)} className="text-sm text-muted">ยกเลิก</button><button type="button" disabled={pending} onClick={() => void remove()} className="rounded-lg bg-danger px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "กำลังลบ…" : "ยืนยันลบ"}</button></Modal.Footer></Modal.Dialog></Modal.Container></Modal.Backdrop>
  </div>;
}

function DiscountCodeEditor({ record, pending, onSave, onClose }: { record: DiscountCode | null; pending: boolean; onSave: (body: Record<string, unknown>, creating: boolean) => Promise<string | null>; onClose: () => void }) {
  const [type, setType] = useState<DiscountType>(record?.type ?? "PERCENT");
  const [code, setCode] = useState(record?.code ?? "");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    const form = new FormData(event.currentTarget); setError("");
    const result = await onSave({ code, type, value: form.get("value"), minSubtotal: form.get("minSubtotal"), maxDiscount: type === "PERCENT" ? form.get("maxDiscount") : "", usageLimit: form.get("usageLimit"), expiresAt: form.get("expiresAt"), active: form.get("active") === "on" }, !record);
    if (result) setError(result); else onClose();
  }
  return <Modal.Backdrop isOpen onOpenChange={(open) => { if (!open && !pending) onClose(); }}><Modal.Container size="lg" placement="center" scroll="inside"><Modal.Dialog className="w-full max-w-[520px] overflow-hidden rounded-2xl bg-overlay p-0 text-foreground shadow-2xl">
    <Modal.CloseTrigger isDisabled={pending} />
    <Modal.Header className="border-b border-border px-6 py-5"><Modal.Heading className="text-lg font-semibold">{record ? "แก้ไขโค้ดส่วนลด" : "สร้างโค้ดส่วนลด"}</Modal.Heading></Modal.Header>
    <Modal.Body className="m-0 px-6 py-5">
      {error && <p role="alert" className="mb-4 rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>}
      <form id="discount-editor" onSubmit={submit}><fieldset disabled={pending} className="space-y-4 border-0 p-0">
        <label className="block text-sm font-medium">โค้ด *
          <div className="mt-1.5 flex gap-2"><input required value={code} readOnly={!!record} onChange={(event) => setCode(event.target.value.toUpperCase())} minLength={3} maxLength={30} pattern="[A-Za-z0-9_\-]{3,30}" placeholder="เช่น WELCOME100" className={`${catalogField} mt-0 font-mono uppercase`} />{!record && <button type="button" onClick={() => setCode(randomCode())} className="shrink-0 rounded-lg border border-border px-3 text-sm text-accent hover:bg-accent-soft">สุ่มโค้ด</button>}</div>
          <span className="mt-1 block text-xs font-normal text-muted">{record ? "โค้ดเปลี่ยนไม่ได้หลังสร้าง" : "A-Z ตัวเลข ขีดกลาง ขีดล่าง ยาว 3–30 ตัว ลูกค้ากรอกตัวพิมพ์เล็กหรือใหญ่ก็ได้"}</span></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">ประเภทส่วนลด *<select value={type} onChange={(event) => setType(event.target.value as DiscountType)} className={catalogField}><option value="PERCENT">เปอร์เซ็นต์ (%)</option><option value="FIXED">จำนวนเงิน (฿)</option></select></label>
          <label className="block text-sm font-medium">{type === "PERCENT" ? "ลดกี่เปอร์เซ็นต์ *" : "ลดกี่บาท *"}<input name="value" required inputMode="numeric" pattern="\d+" defaultValue={record?.value} placeholder={type === "PERCENT" ? "10" : "100"} className={catalogField} /></label>
          <label className="block text-sm font-medium">ยอดซื้อขั้นต่ำ (฿)<input name="minSubtotal" inputMode="numeric" pattern="\d*" defaultValue={record?.minSubtotal || ""} placeholder="ไม่ระบุ = ไม่มีขั้นต่ำ" className={catalogField} /></label>
          {type === "PERCENT" && <label className="block text-sm font-medium">ลดสูงสุด (฿)<input name="maxDiscount" inputMode="numeric" pattern="\d*" defaultValue={record?.maxDiscount ?? ""} placeholder="ไม่ระบุ = ไม่จำกัด" className={catalogField} /></label>}
          <label className="block text-sm font-medium">ใช้ได้ทั้งหมดกี่ครั้ง<input name="usageLimit" inputMode="numeric" pattern="\d*" defaultValue={record?.usageLimit ?? ""} placeholder="ไม่ระบุ = ไม่จำกัด" className={catalogField} /></label>
          <label className="block text-sm font-medium">ใช้ได้ถึงวันที่<input name="expiresAt" type="date" min={today()} defaultValue={record?.expiresAt ?? ""} className={catalogField} /></label>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={record?.active ?? true} className="size-4 accent-[var(--accent)]" />เปิดใช้งานโค้ดนี้</label>
        {record && <p className="text-xs text-muted">ใช้ไปแล้ว {record.usedCount} ครั้ง</p>}
      </fieldset></form>
    </Modal.Body>
    <Modal.Footer className="flex items-center justify-end gap-2 border-t border-border bg-surface-secondary/40 px-6 py-4"><button type="button" disabled={pending} onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-medium text-muted hover:bg-surface-secondary disabled:opacity-50">ยกเลิก</button><button type="submit" form="discount-editor" disabled={pending} className={catalogPrimary}>{pending ? "กำลังบันทึก…" : "บันทึกโค้ด"}</button></Modal.Footer>
  </Modal.Dialog></Modal.Container></Modal.Backdrop>;
}
