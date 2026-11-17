"use client";

import { Modal } from "@heroui/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { CatalogBrand, CatalogCategory, CatalogKind } from "@/lib/catalog-metadata";
import { ProductImages } from "./product-images";
import { discardDraftImages } from "./image-draft-cleanup";
import { BrandMark } from "@/components/ui/brand-mark";
import { ChevronDownIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { builtInSpecFields, MAX_CATEGORY_SPEC_FIELDS } from "@/lib/product-specification-templates";
import type { CategorySpecField } from "@/lib/types";

export type CatalogRecord = CatalogBrand | CatalogCategory;
export const catalogField = "mt-1.5 min-h-10 w-full rounded-lg border border-[var(--field-border)] bg-[var(--field-background)] px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:opacity-50 read-only:bg-surface-secondary";
export const catalogPrimary = "inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50";

type SpecRow = CategorySpecField & { key: string };
const withKeys = (fields: CategorySpecField[]): SpecRow[] => fields.map((field) => ({ ...field, key: crypto.randomUUID() }));

type Props = { kind: CatalogKind; record: CatalogRecord | null; pending: boolean; onSave: (body: Record<string, unknown>) => Promise<string | null>; onClose: () => void };

export function CatalogEditor({ kind, record, pending, onSave, onClose }: Props) {
  const category = record && "slug" in record ? record : null;
  const brand = record && "logoUrl" in record ? record : null;
  const originalImage = category?.image ?? brand?.logoUrl ?? "";
  const [images, setImages] = useState<string[]>(originalImage ? [originalImage] : []);
  const [draftId] = useState(() => crypto.randomUUID());
  const saved = useRef(false), hasUploads = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [fields, setFields] = useState<SpecRow[]>(() => withKeys(category?.specFields ?? []));
  const busy = pending || uploading;
  const title = kind === "brand" ? "แบรนด์" : "หมวดหมู่";

  useEffect(() => {
    const abandon = () => { if (!saved.current && hasUploads.current) void discardDraftImages(draftId); };
    const hide = (event: PageTransitionEvent) => { if (!event.persisted) abandon(); };
    window.addEventListener("pagehide", hide);
    return () => { window.removeEventListener("pagehide", hide); abandon(); };
  }, [draftId]);

  function changeImages(next: string[]) {
    if (next.some((url) => url !== originalImage)) hasUploads.current = true;
    const removed = images.filter((url) => !next.includes(url));
    setImages(next);
    if (removed.length) void discardDraftImages(draftId, removed);
  }

  const editField = (key: string, patch: Partial<CategorySpecField>) => setFields((rows) => rows.map((row) => row.key === key ? { ...row, ...patch } : row));
  const moveField = (index: number, by: -1 | 1) => setFields((rows) => { const next = [...rows]; [next[index], next[index + by]] = [next[index + by], next[index]]; return next; });
  const starter = builtInSpecFields(slug.trim());
  const missingStarter = starter.filter((field) => !fields.some((row) => row.label.trim().toLowerCase() === field.label.toLowerCase()));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = new FormData(event.currentTarget);
    setError("");
    const result = await onSave({ kind, draftId, ...(record ? { id: record.id } : {}), name: form.get("name"), ...(kind === "brand" ? { logoUrl: images[0] ?? "" } : { nameTh: form.get("nameTh"), slug: category?.slug ?? slug, description: form.get("description"), image: images[0] ?? "", specFields: fields.map(({ label, example, hint, compatibility, powerAdvice }) => ({ label, example, hint, compatibility, powerAdvice })) }) });
    if (result) setError(result); else { saved.current = true; onClose(); }
  }

  return <Modal.Backdrop isOpen onOpenChange={(open) => { if (!open && !busy) onClose(); }}><Modal.Container size="lg" placement="center" scroll="inside"><Modal.Dialog className="w-full max-w-[600px] overflow-hidden rounded-2xl bg-overlay p-0 text-foreground shadow-2xl">
    <Modal.CloseTrigger isDisabled={busy} />
    <Modal.Header className="border-b border-border px-6 py-5"><Modal.Heading className="text-lg font-semibold">{record ? "แก้ไข" : "เพิ่ม"}{title}</Modal.Heading></Modal.Header>
    <Modal.Body className="m-0 px-6 py-5">
      {error && <p role="alert" className="mb-4 rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>}
      <form id="catalog-editor" onSubmit={save}><fieldset disabled={busy} className="space-y-5 border-0 p-0">
        {kind === "brand" ? <label className="block text-sm font-medium">ชื่อแบรนด์ *<input name="name" required maxLength={100} defaultValue={brand?.name} readOnly={!!brand?.mockapiProductCount} className={catalogField} placeholder="เช่น ASUS" />{!!brand?.mockapiProductCount && <span className="mt-1 block text-xs font-normal text-muted">มีสินค้า MockAPI อ้างอิงชื่อนี้อยู่ จึงเปลี่ยนชื่อไม่ได้ แต่ยังแก้ไขโลโก้ได้</span>}</label> : <>
          <label className="block text-sm font-medium">ชื่อหมวดหมู่ภาษาไทย *<input name="nameTh" required maxLength={255} defaultValue={category?.nameTh} className={catalogField} placeholder="เช่น การ์ดจอ" /></label>
          <label className="block text-sm font-medium">ชื่อภาษาอังกฤษ<input name="name" maxLength={255} defaultValue={category?.name} className={catalogField} placeholder="เช่น Graphics Card" /></label>
          <label className="block text-sm font-medium">รหัสหมวดหมู่ (Slug) *<input name="slug" required maxLength={180} pattern="[a-z0-9]+(-[a-z0-9]+)*" readOnly={!!record} value={slug} onChange={(event) => setSlug(event.target.value)} className={catalogField} placeholder="graphics-card" /><span className="mt-1 block text-xs font-normal text-muted">อักษรอังกฤษตัวเล็ก ตัวเลข และขีดกลาง · รหัสจะคงเดิมหลังสร้าง</span></label>
          <label className="block text-sm font-medium">คำอธิบาย<textarea name="description" rows={3} maxLength={2000} defaultValue={category?.description} className={`${catalogField} resize-y`} /></label>
          <section aria-label="สเปกเริ่มต้นของหมวดหมู่" className="space-y-3 border-t border-border pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">สเปกเริ่มต้น</h3><p className="mt-1 text-xs font-normal text-muted">ช่องสเปกที่จะแสดงให้กรอกอัตโนมัติเมื่อเพิ่มสินค้าในหมวดนี้ · {fields.length}/{MAX_CATEGORY_SPEC_FIELDS} ช่อง</p></div>
              <button type="button" disabled={fields.length >= MAX_CATEGORY_SPEC_FIELDS} onClick={() => setFields((rows) => [...rows, { key: crypto.randomUUID(), label: "", example: "" }])} className="inline-flex items-center gap-1 text-sm text-accent disabled:opacity-50"><PlusIcon size={16} />เพิ่มสเปก</button></div>
            {!!missingStarter.length && <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-accent-soft/50 p-3"><p className="text-xs text-muted">มีชุดสเปกแนะนำสำหรับหมวด “{slug.trim()}” อีก {missingStarter.length} ช่อง</p><button type="button" disabled={fields.length + missingStarter.length > MAX_CATEGORY_SPEC_FIELDS} onClick={() => setFields((rows) => [...rows, ...withKeys(missingStarter)])} className="text-sm text-accent disabled:opacity-50">เพิ่มชุดแนะนำ</button></div>}
            {!fields.length && <p className="text-sm text-muted">ยังไม่มีสเปกเริ่มต้น สินค้าในหมวดนี้จะเริ่มจากฟอร์มว่าง</p>}
            {fields.map((field, index) => <div key={field.key} className="rounded-lg border border-border p-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <input aria-label={`ชื่อสเปก ${index + 1}`} required maxLength={120} value={field.label} onChange={(event) => editField(field.key, { label: event.target.value })} className={`${catalogField} mt-0 min-w-0`} placeholder="ชื่อสเปก เช่น Socket" />
                <div className="col-start-2 row-start-1 flex items-center justify-end sm:col-start-3"><button type="button" aria-label={`เลื่อนสเปก ${index + 1} ขึ้น`} disabled={!index} onClick={() => moveField(index, -1)} className="rounded-lg p-2 text-muted hover:bg-surface-secondary disabled:opacity-30"><ChevronDownIcon size={16} className="rotate-180" /></button><button type="button" aria-label={`เลื่อนสเปก ${index + 1} ลง`} disabled={index === fields.length - 1} onClick={() => moveField(index, 1)} className="rounded-lg p-2 text-muted hover:bg-surface-secondary disabled:opacity-30"><ChevronDownIcon size={16} /></button><button type="button" aria-label={`ลบสเปก ${index + 1}`} onClick={() => setFields((rows) => rows.filter((row) => row.key !== field.key))} className="rounded-lg p-2 text-muted hover:bg-danger-soft hover:text-danger"><TrashIcon size={17} /></button></div>
                <input aria-label={`ตัวอย่างค่า ${index + 1}`} maxLength={255} value={field.example} onChange={(event) => editField(field.key, { example: event.target.value })} className={`${catalogField} mt-0 col-span-2 min-w-0 sm:col-span-1 sm:col-start-2 sm:row-start-1`} placeholder="ตัวอย่างค่า เช่น AM5 หรือ LGA1700" />
                <input aria-label={`คำอธิบายสเปก ${index + 1}`} maxLength={500} value={field.hint ?? ""} onChange={(event) => editField(field.key, { hint: event.target.value })} className={`${catalogField} mt-0 col-span-2 min-w-0 sm:col-span-3`} placeholder="คำอธิบายให้คนกรอก เช่น ยาว x กว้าง x สูง (มม.)" />
              </div>
              {(field.compatibility || field.powerAdvice) && <p className="mt-2 text-xs text-muted">{field.compatibility && <span className="mr-2 text-accent">ใช้ตรวจความเข้ากันได้</span>}{field.powerAdvice && <span className="mr-2 text-accent">ใช้แสดงคำแนะนำกำลังไฟ</span>}ระบบอ่านค่าจากชื่อสเปกนี้ หากเปลี่ยนชื่อหรือลบ การตรวจใน PC Builder อาจใช้ไม่ได้</p>}
            </div>)}
          </section>
        </>}
        <div className="border-t border-border pt-5"><ProductImages label={kind === "brand" ? "โลโก้แบรนด์" : "รูปหมวดหมู่"} required={false} maxImages={1} images={images} draftId={draftId} onChange={changeImages} pending={pending} onUploadingChange={setUploading} fallbackPreview={brand && !brand.logoUrl ? <BrandMark brand={brand.name} /> : undefined} /></div>
        <p className="-mt-2 text-xs text-muted">{kind === "brand" ? "ถ้าไม่อัปโหลด ระบบใช้โลโก้เดิมหรืออักษรย่อของแบรนด์" : "ถ้าไม่อัปโหลด ระบบใช้รูปหมวดหมู่เริ่มต้น"}</p>
      </fieldset></form>
    </Modal.Body>
    <Modal.Footer className="flex items-center justify-end gap-2 border-t border-border bg-surface-secondary/40 px-6 py-4"><button type="button" disabled={busy} onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-medium text-muted hover:bg-surface-secondary disabled:opacity-50">ยกเลิก</button><button type="submit" form="catalog-editor" disabled={busy} className={catalogPrimary}>{uploading ? "กำลังอัปโหลด…" : pending ? "กำลังบันทึก…" : "บันทึกข้อมูล"}</button></Modal.Footer>
  </Modal.Dialog></Modal.Container></Modal.Backdrop>;
}
