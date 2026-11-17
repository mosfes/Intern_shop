"use client";

import { useAdminDataState, useAdminFetch } from "./admin-data";

import { Modal } from "@heroui/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { EditIcon, GridIcon, PackageIcon, PlusIcon, SearchIcon, TrashIcon } from "@/components/icons";
import { BrandMark } from "@/components/ui/brand-mark";
import { useFeedback } from "@/components/feedback-provider";
import type { CatalogDirectory as Directory, CatalogKind } from "@/lib/catalog-metadata";
import { CatalogEditor, catalogField, catalogPrimary, type CatalogRecord } from "./catalog-editor";
import { AdminContentSkeleton } from "./admin-skeleton";
import { AdminPageHeader } from "./user-directory";

const PAGE_SIZE = 12;
const recordName = (record: CatalogRecord) => "nameTh" in record ? record.nameTh : record.name;
async function read(response: Response) {
  if (response.status === 401 || response.status === 403) { window.location.replace("/auth/complete"); throw new Error("กรุณาตรวจสอบสิทธิ์การใช้งาน"); }
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "ดำเนินการไม่สำเร็จ กรุณาลองอีกครั้ง");
  return result;
}

export function CatalogDirectory({ kind }: { kind: CatalogKind }) {
  const adminFetch = useAdminFetch("catalog");
  const router = useRouter(); const feedback = useFeedback();
  const [data, setData] = useAdminDataState<Directory>("catalog");
  const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  const [query, setQuery] = useState(""); const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{ record: CatalogRecord | null } | null>(null);
  const [deleting, setDeleting] = useState<CatalogRecord | null>(null); const [deleteError, setDeleteError] = useState("");
  const categories = kind === "category"; const title = categories ? "หมวดหมู่" : "แบรนด์";
  const refresh = useCallback(async () => {
    setError("");
    try { setData(await read(await adminFetch("/api/admin/catalog", { cache: "no-store" }))); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "โหลดข้อมูลไม่สำเร็จ"); }
  }, [adminFetch, setData]);
  useEffect(() => { const timer = window.setTimeout(() => { void refresh(); }, 0); return () => window.clearTimeout(timer); }, [refresh]);

  async function save(body: Record<string, unknown>): Promise<string | null> {
    setPending(true);
    try {
      const { record } = await read(await adminFetch("/api/admin/catalog", { method: editor?.record ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
      setData((current) => current && (categories ? { ...current, categories: [...current.categories.filter((row) => row.id !== record.id), record] } : { ...current, brands: [...current.brands.filter((row) => row.id !== record.id), record] }));
      router.refresh(); feedback({ title: "บันทึกข้อมูลแล้ว", description: `อัปเดต${title}เรียบร้อยแล้ว` }); return null;
    } catch (cause) { return cause instanceof Error ? cause.message : "บันทึกไม่สำเร็จ"; }
    finally { setPending(false); }
  }
  async function remove() {
    if (!deleting) return; setPending(true); setDeleteError("");
    try {
      await read(await adminFetch("/api/admin/catalog", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, id: deleting.id }) }));
      setData((current) => current && (categories ? { ...current, categories: current.categories.filter((row) => row.id !== deleting.id) } : { ...current, brands: current.brands.filter((row) => row.id !== deleting.id) }));
      setDeleting(null); router.refresh(); feedback({ title: "ลบข้อมูลแล้ว", description: `นำ${title}ออกจากรายการเรียบร้อยแล้ว` });
    } catch (cause) { setDeleteError(cause instanceof Error ? cause.message : "ลบไม่สำเร็จ"); }
    finally { setPending(false); }
  }

  if (!data && !error) return <AdminContentSkeleton section={categories ? "categories" : "brands"} />;
  const rows: CatalogRecord[] = data ? categories ? data.categories : data.brands : [];
  const filtered = rows.filter((row) => `${row.name} ${"slug" in row ? `${row.slug} ${row.nameTh}` : ""}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).sort((a, b) => recordName(a).localeCompare(recordName(b), "th"));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)); const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  return <div className="space-y-6">
    <AdminPageHeader title={`จัดการ${title}`} description={`เพิ่มและแก้ไข${title}สำหรับสินค้าและหน้าร้าน`} action={<button type="button" disabled={!data || pending} onClick={() => setEditor({ record: null })} className={catalogPrimary}><PlusIcon size={18} />เพิ่ม{title}</button>} />
    {error && <p role="alert" className="rounded-lg bg-danger-soft p-4 text-sm text-danger">{error}<button type="button" onClick={() => void refresh()} className="ml-3 underline">ลองใหม่</button></p>}
    <div className="grid grid-cols-2 gap-3"><div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-5"><GridIcon className="text-accent" /><div><p className="text-xs text-muted">{title}ทั้งหมด</p><p className="mt-1 text-2xl font-semibold">{rows.length}</p></div></div><div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-5"><PackageIcon className="text-accent" /><div><p className="text-xs text-muted">มีสินค้าใช้งาน</p><p className="mt-1 text-2xl font-semibold">{rows.filter((row) => row.productCount > 0).length}</p></div></div></div>
    <section aria-label={`รายการ${title}`} className="overflow-hidden rounded-xl border border-border bg-surface">
      <label className="relative m-4 block"><span className="sr-only">ค้นหา{title}</span><SearchIcon size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder={`ค้นหา${title}…`} className={`${catalogField} mt-0 pl-9`} /></label>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="whitespace-nowrap border-y border-border bg-surface-secondary/50 text-xs text-muted"><tr><th scope="col" className="px-5 py-4">{title}</th>{categories && <th scope="col" className="px-4 py-4">รหัส</th>}<th scope="col" className="px-4 py-4">สินค้า</th><th scope="col" className="px-4 py-4 text-right">จัดการ</th></tr></thead><tbody className="divide-y divide-border">{visible.map((row) => <tr key={row.id} className="hover:bg-surface-secondary/40">
        <td className="px-5 py-4"><div className="flex items-center gap-3"><span className={`relative grid h-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-white ${"image" in row ? "w-12" : "w-[104px] px-2"}`}>{"image" in row ? <Image src={row.image} alt="" fill sizes="48px" className="object-contain p-1" /> : row.logoUrl ? <Image src={row.logoUrl} alt="" fill sizes="104px" className="object-contain p-1.5" /> : <BrandMark brand={row.name} />}</span><span className="min-w-36 max-w-64 break-words font-medium">{recordName(row)}</span></div></td>
        {"slug" in row && <td className="px-4 py-4 font-mono text-xs text-muted">{row.slug}</td>}
        <td className="whitespace-nowrap px-4 py-4 tabular-nums">{row.productCount} รายการ</td>
        <td className="px-4 py-4"><div className="flex items-center justify-end gap-1"><button type="button" disabled={pending} aria-label={`แก้ไข${title} ${recordName(row)}`} onClick={() => setEditor({ record: row })} className="rounded-lg p-2 text-muted hover:bg-accent-soft hover:text-accent disabled:opacity-50"><EditIcon size={17} /></button><span title={row.productCount ? "ยังมีสินค้าใช้รายการนี้อยู่" : undefined}><button type="button" disabled={pending || row.productCount > 0} aria-label={`ลบ${title} ${recordName(row)}`} onClick={() => { setDeleting(row); setDeleteError(""); }} className="rounded-lg p-2 text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-30"><TrashIcon size={17} /></button></span></div></td>
      </tr>)}</tbody></table>{!visible.length && <p className="px-6 py-12 text-center text-sm text-muted">{query ? "ไม่พบรายการที่ตรงกับคำค้นหา" : `ยังไม่มี${title} เริ่มเพิ่มรายการใหม่ได้เลย`}</p>}</div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 text-xs text-muted"><p role="status">แสดง {visible.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} จาก {filtered.length} รายการ</p><div className="flex items-center gap-3"><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="rounded-md border border-border px-3 py-2 disabled:opacity-40">ก่อนหน้า</button><span>{currentPage}/{pages}</span><button type="button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)} className="rounded-md border border-border px-3 py-2 disabled:opacity-40">ถัดไป</button></div></div>
    </section>
    {editor && <CatalogEditor kind={kind} record={editor.record} pending={pending} onSave={save} onClose={() => setEditor(null)} />}
    <Modal.Backdrop isOpen={!!deleting} onOpenChange={(open) => { if (!open && !pending) setDeleting(null); }}><Modal.Container size="sm" placement="center"><Modal.Dialog className="rounded-2xl bg-overlay p-0 text-foreground"><Modal.CloseTrigger isDisabled={pending} /><Modal.Header className="px-6 pt-6"><Modal.Heading>ลบ{title}</Modal.Heading></Modal.Header><Modal.Body className="px-6 py-4"><p className="break-words text-sm">ต้องการลบ <strong>{deleting ? recordName(deleting) : ""}</strong> หรือไม่?</p><p className="mt-2 text-xs text-muted">ลบได้เฉพาะรายการที่ไม่มีสินค้าใช้งาน</p>{deleteError && <p role="alert" className="mt-3 text-sm text-danger">{deleteError}</p>}</Modal.Body><Modal.Footer className="flex justify-end gap-4 border-t border-border px-6 py-4"><button type="button" disabled={pending} onClick={() => setDeleting(null)} className="text-sm text-muted">ยกเลิก</button><button type="button" disabled={pending} onClick={() => void remove()} className="rounded-lg bg-danger px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "กำลังลบ…" : "ยืนยันลบ"}</button></Modal.Footer></Modal.Dialog></Modal.Container></Modal.Backdrop>
  </div>;
}
