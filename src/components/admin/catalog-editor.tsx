"use client";

import { Modal } from "@heroui/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { CatalogBrand, CatalogCategory, CatalogKind } from "@/lib/catalog-metadata";
import { ProductImages } from "./product-images";
import { discardDraftImages } from "./image-draft-cleanup";
import { BrandMark } from "@/components/ui/brand-mark";

export type CatalogRecord = CatalogBrand | CatalogCategory;
export const catalogField = "mt-1.5 min-h-10 w-full rounded-lg border border-[var(--field-border)] bg-[var(--field-background)] px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:opacity-50 read-only:bg-surface-secondary";
export const catalogPrimary = "inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50";

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

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = new FormData(event.currentTarget);
    setError("");
    const result = await onSave({ kind, draftId, ...(record ? { id: record.id } : {}), name: form.get("name"), ...(kind === "brand" ? { logoUrl: images[0] ?? "" } : { nameTh: form.get("nameTh"), slug: category?.slug ?? form.get("slug"), description: form.get("description"), image: images[0] ?? "" }) });
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
          <label className="block text-sm font-medium">รหัสหมวดหมู่ (Slug) *<input name="slug" required maxLength={180} pattern="[a-z0-9]+(-[a-z0-9]+)*" readOnly={!!record} defaultValue={category?.slug} className={catalogField} placeholder="graphics-card" /><span className="mt-1 block text-xs font-normal text-muted">อักษรอังกฤษตัวเล็ก ตัวเลข และขีดกลาง · รหัสจะคงเดิมหลังสร้าง</span></label>
          <label className="block text-sm font-medium">คำอธิบาย<textarea name="description" rows={3} maxLength={2000} defaultValue={category?.description} className={`${catalogField} resize-y`} /></label>
        </>}
        <div className="border-t border-border pt-5"><ProductImages label={kind === "brand" ? "โลโก้แบรนด์" : "รูปหมวดหมู่"} required={false} maxImages={1} images={images} draftId={draftId} onChange={changeImages} pending={pending} onUploadingChange={setUploading} fallbackPreview={brand && !brand.logoUrl ? <BrandMark brand={brand.name} /> : undefined} /></div>
        <p className="-mt-2 text-xs text-muted">{kind === "brand" ? "ถ้าไม่อัปโหลด ระบบใช้โลโก้เดิมหรืออักษรย่อของแบรนด์" : "ถ้าไม่อัปโหลด ระบบใช้รูปหมวดหมู่เริ่มต้น"}</p>
      </fieldset></form>
    </Modal.Body>
    <Modal.Footer className="flex items-center justify-end gap-2 border-t border-border bg-surface-secondary/40 px-6 py-4"><button type="button" disabled={busy} onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-medium text-muted hover:bg-surface-secondary disabled:opacity-50">ยกเลิก</button><button type="submit" form="catalog-editor" disabled={busy} className={catalogPrimary}>{uploading ? "กำลังอัปโหลด…" : pending ? "กำลังบันทึก…" : "บันทึกข้อมูล"}</button></Modal.Footer>
  </Modal.Dialog></Modal.Container></Modal.Backdrop>;
}
