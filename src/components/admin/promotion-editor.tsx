"use client";

import { Label, Modal, Switch } from "@heroui/react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { PROMOTION_PLACEMENTS, type Promotion, type PromotionPlacement, type PromotionTheme } from "@/lib/promotions";
import { ProductImages } from "./product-images";
import { discardDraftImages } from "./image-draft-cleanup";
import { catalogField, catalogPrimary } from "./catalog-editor";
import { LinkPicker } from "./link-picker";
import { scrollToField } from "./scroll-to-field";

type Props = { promotion: Promotion | null; placement: PromotionPlacement; pending: boolean; onSave: (body: Record<string, unknown>) => Promise<string | null>; onClose: () => void };

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="block text-sm font-medium">{label}{children}{hint && <span className="mt-1 block text-xs font-normal text-muted">{hint}</span>}</label>;
}

export function PromotionEditor({ promotion, placement: initialPlacement, pending, onSave, onClose }: Props) {
  const placement = promotion?.placement ?? initialPlacement;
  const placementInfo = PROMOTION_PLACEMENTS.find((entry) => entry.id === placement)!;
  const [theme, setTheme] = useState<PromotionTheme>(promotion?.theme ?? "light");
  const [active, setActive] = useState(promotion?.active ?? true);
  const originalImage = promotion?.image ?? "";
  const [images, setImages] = useState<string[]>(originalImage ? [originalImage] : []);
  const [draftId] = useState(() => crypto.randomUUID());
  const saved = useRef(false), hasUploads = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState(false);
  const imageField = useRef<HTMLDivElement>(null);
  const busy = pending || uploading;
  const hero = placement === "HERO", side = placement === "SIDE";

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
    if (next.length) setImageError(false);
    if (removed.length) void discardDraftImages(draftId, removed);
  }

  function showImageError() {
    setImageError(true);
    scrollToField(imageField.current);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    if (!images[0]) { showImageError(); return; }
    const form = Object.fromEntries(new FormData(event.currentTarget));
    setError("");
    const result = await onSave({ ...form, ...(promotion ? { id: promotion.id } : {}), draftId, placement, theme, active, image: images[0] });
    if (result) setError(result); else { saved.current = true; onClose(); }
  }

  return <Modal.Backdrop isOpen onOpenChange={(open) => { if (!open && !busy) onClose(); }}><Modal.Container size="lg" placement="center" scroll="inside"><Modal.Dialog className="w-full max-w-[640px] overflow-hidden rounded-2xl bg-overlay p-0 text-foreground shadow-2xl">
    <Modal.CloseTrigger isDisabled={busy} />
    <Modal.Header className="border-b border-border px-6 py-5"><Modal.Heading className="text-lg font-semibold">{promotion ? "แก้ไข" : "เพิ่ม"}{placementInfo.label}</Modal.Heading><p className="mt-0.5 text-xs text-muted">{placementInfo.description}</p></Modal.Header>
    <Modal.Body className="m-0 px-6 py-5">
      {error && <p role="alert" className="mb-4 rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>}
      <form id="promotion-editor" onSubmit={save}><fieldset disabled={busy} className="space-y-5 border-0 p-0">
        <div className={`grid gap-5 ${hero ? "sm:grid-cols-2" : ""}`}>
          <Field label={hero ? "ป้ายกำกับ *" : side ? "ข้อความเล็กเหนือหัวข้อ *" : "ข้อความเล็กเหนือหัวข้อ"} hint={hero ? "เช่น มาใหม่, โปรโมชั่น" : "เช่น โปรโมชั่น, อัปเกรดเซ็ตอัป"}><input name="tag" required={placement !== "BANNER"} maxLength={60} defaultValue={promotion?.tag} className={catalogField} /></Field>
          {hero && <Field label="หัวข้อย่อย" hint="เช่น GeForce RTX 50 Series"><input name="eyebrow" maxLength={120} defaultValue={promotion?.eyebrow} className={catalogField} /></Field>}
        </div>
        <Field label="หัวข้อ *"><input name="title" required maxLength={160} defaultValue={promotion?.title} className={catalogField} placeholder={hero ? "GeForce RTX 5070" : "SSD NVMe ลดสูงสุด 16%"} /></Field>
        {hero && <Field label="ข้อความราคา/ไฮไลต์" hint="แสดงเป็นตัวใหญ่สีส้มใต้หัวข้อ เช่น เริ่มต้น ฿22,900"><input name="highlight" maxLength={120} defaultValue={promotion?.highlight} className={catalogField} /></Field>}
        {!side && <Field label="คำอธิบาย"><textarea name="description" rows={2} maxLength={500} defaultValue={promotion?.description} className={`${catalogField} resize-y`} /></Field>}

        <div className="space-y-3 rounded-xl border border-border p-4">
          <LinkPicker name="ctaHref" label={side ? "เมื่อคลิกการ์ด ไปที่" : hero ? "ปุ่มหลัก ไปที่" : "ปุ่ม ไปที่"} required defaultValue={promotion?.ctaHref} />
          {!side && <Field label={hero ? "ข้อความบนปุ่มหลัก *" : "ข้อความบนปุ่ม"} hint={hero ? undefined : "ว่างไว้จะใช้ \"ดูสินค้า\""}><input name="ctaLabel" required={hero} maxLength={60} defaultValue={promotion?.ctaLabel} className={catalogField} placeholder="เช่น ช้อปการ์ดจอ" /></Field>}
        </div>
        {hero && <div className="space-y-3 rounded-xl border border-border p-4">
          <LinkPicker name="secondaryHref" label="ปุ่มรอง ไปที่" emptyLabel="ไม่แสดงปุ่มรอง (เลือกเพื่อเพิ่ม)" defaultValue={promotion?.secondaryHref} />
          <Field label="ข้อความบนปุ่มรอง"><input name="secondaryLabel" maxLength={60} defaultValue={promotion?.secondaryLabel} className={catalogField} placeholder="เช่น ดู RTX 5070" /></Field>
        </div>}

        {side && <div role="radiogroup" aria-label="สีพื้นหลัง"><p className="text-sm font-medium">สีพื้นหลัง</p><div className="mt-1.5 flex gap-2">{([["light", "สว่าง", "bg-[#f7f0e9] text-[#1a1a1a]"], ["dark", "เข้ม", "bg-[#20252d] text-white"]] as const).map(([value, label, swatch]) => <button key={value} type="button" role="radio" aria-checked={theme === value} onClick={() => setTheme(value)} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${theme === value ? "border-accent ring-2 ring-accent/15" : "border-border"}`}><span className={`size-5 rounded-md border border-border ${swatch}`} />{label}</button>)}</div></div>}

        <div ref={imageField} className={`border-t border-border pt-5 ${imageError ? "-mx-2 rounded-xl px-2 pb-2 ring-2 ring-danger/60" : ""}`}>
          {imageError && <p role="alert" className="mb-3 rounded-lg bg-danger-soft p-3 flex items-center gap-1.5 text-sm font-medium text-danger">ยังบันทึกไม่ได้: กรุณาอัปโหลดรูปโปรโมชัน 1 รูป (JPG, PNG หรือ WebP)</p>}
          <ProductImages label="รูปโปรโมชัน" required maxImages={1} images={images} draftId={draftId} onChange={changeImages} pending={pending} onUploadingChange={setUploading} />
        </div>
        <p className="-mt-2 text-xs text-muted">แนะนำรูปสินค้าพื้นหลังโปร่งใส (PNG/WebP) เพื่อให้กลมกลืนกับแบนเนอร์</p>

        <Switch aria-label="แสดงบนหน้าร้าน" isSelected={active} onChange={setActive} isDisabled={busy} className="w-full rounded-xl border border-border bg-surface-secondary/50 p-4">
          <Switch.Content className="w-full justify-between gap-4">
            <span className="min-w-0"><Label className="text-sm font-semibold">แสดงบนหน้าร้าน</Label><span className="mt-1 block text-xs leading-relaxed text-muted">{active ? "ลูกค้าจะเห็นโปรโมชันนี้ที่หน้าแรก" : "ซ่อนไว้ ยังไม่แสดงที่หน้าแรก"}</span></span>
            <Switch.Control><Switch.Thumb /></Switch.Control>
          </Switch.Content>
        </Switch>
      </fieldset></form>
    </Modal.Body>
    <Modal.Footer className="flex items-center justify-end gap-2 border-t border-border bg-surface-secondary/40 px-6 py-4"><button type="button" disabled={busy} onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-medium text-muted hover:bg-surface-secondary disabled:opacity-50">ยกเลิก</button><button type="submit" form="promotion-editor" disabled={busy} onClick={() => { if (!images[0]) setImageError(true); }} className={catalogPrimary}>{uploading ? "กำลังอัปโหลด…" : pending ? "กำลังบันทึก…" : "บันทึกโปรโมชัน"}</button></Modal.Footer>
  </Modal.Dialog></Modal.Container></Modal.Backdrop>;
}
