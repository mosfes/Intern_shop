"use client";

import { Checkbox, Chip, ComboBox, Input, Label, ListBox, Modal } from "@heroui/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { BrandMark } from "@/components/ui/brand-mark";
import { PRODUCT_TAGS } from "@/lib/product-management";
import type { Category, Product } from "@/lib/types";
import { buildProductHighlights, createProductSpecificationDrafts } from "@/lib/product-highlights";
import { addSpecificationDefaults } from "@/lib/product-specification-templates";
import { ProductCategoryPicker } from "./product-category-picker";
import { ProductPricing } from "./product-pricing";
import { ProductSelect } from "./product-select";
import { ProductSpecifications } from "./product-specifications";
import { ProductImages } from "./product-images";
import { discardDraftImages } from "./image-draft-cleanup";

export const productField = "mt-1.5 min-h-10 w-full rounded-lg border border-[var(--field-border)] bg-[var(--field-background)] px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:opacity-50";
export const productPrimary = "inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50";

type Props = {
  product: Product | null; categories: Category[]; brands: string[]; pending: boolean;
  onSave: (body: Record<string, unknown>) => Promise<string | null>; onClose: () => void;
};

export function ProductEditor({ product, categories, brands, pending, onSave, onClose }: Props) {
  const [error, setError] = useState("");
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [draftId] = useState(() => crypto.randomUUID());
  const saved = useRef(false);
  const hasNewUploads = useRef(false);
  const [uploading, setUploading] = useState(false);
  const busy = pending || uploading;
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(!!product);
  const [category, setCategory] = useState(product?.category ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [warrantyInit] = useState(() => {
    const current = (product?.warranty ?? "").trim();
    const match = current.match(/^(\d{1,3})\s*(เดือน|ปี)$/);
    return { amount: match?.[1] ?? "", unit: match?.[2] ?? "ปี", legacy: match || !current ? "" : current };
  });
  const [warrantyAmount, setWarrantyAmount] = useState(warrantyInit.amount);
  const [warrantyUnit, setWarrantyUnit] = useState(warrantyInit.unit);
  const [specificationData, setSpecificationData] = useState(() => createProductSpecificationDrafts(product?.specifications ?? [], product?.highlights ?? []));
  const { specifications, legacyHighlights } = specificationData;
  const categoryDrafts = useRef(new Map<string, typeof specificationData>());

  useEffect(() => {
    const abandon = () => { if (!saved.current && hasNewUploads.current) void discardDraftImages(draftId); };
    const pageHidden = (event: PageTransitionEvent) => { if (!event.persisted) abandon(); };
    window.addEventListener("pagehide", pageHidden);
    return () => { window.removeEventListener("pagehide", pageHidden); abandon(); };
  }, [draftId]);

  function changeImages(next: string[]) {
    if (next.some((url) => !(product?.images ?? []).includes(url))) hasNewUploads.current = true;
    const removed = images.filter((url) => !next.includes(url));
    setImages(next);
    if (removed.length) void discardDraftImages(draftId, removed);
  }

  const templatesFor = (slug: string) => categories.find((entry) => entry.slug === slug)?.specFields ?? [];

  function changeCategory(next: string) {
    if (next === category) return;
    categoryDrafts.current.set(category, specificationData);
    setSpecificationData(categoryDrafts.current.get(next) ?? {
      specifications: addSpecificationDefaults(templatesFor(next), []),
      legacyHighlights: [],
    });
    setCategory(next);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!images.length) { setError("กรุณาอัปโหลดรูปภาพสินค้าอย่างน้อย 1 รูป"); return; }
    setError("");
    const form = new FormData(event.currentTarget);
    const result = await onSave({
      ...(product ? { id: product.id } : {}),
      draftId,
      name: form.get("name"), slug, brand, category,
      price: Number(form.get("price")), originalPrice: Number(form.get("originalPrice")), stock: Number(form.get("stock")),
      warranty: warrantyAmount ? `${Number(warrantyAmount)} ${warrantyUnit}` : warrantyInit.legacy, description: form.get("description"),
      images, highlights: buildProductHighlights(specifications, legacyHighlights), shortSpecs: product?.shortSpecs ?? [],
      tags: form.getAll("tags"), specifications: specifications.map(({ label, value }) => ({ label, value })),
    });
    if (result) setError(result); else { saved.current = true; onClose(); }
  }

  return <Modal.Backdrop isOpen onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <Modal.Container size="lg" placement="center" scroll="inside">
      <Modal.Dialog className="w-full max-w-[900px] overflow-hidden rounded-2xl bg-overlay p-0 text-foreground shadow-2xl">
        <Modal.CloseTrigger isDisabled={busy} />
        <Modal.Header className="border-b border-border px-6 py-5"><Modal.Heading className="text-lg font-semibold">{product ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}</Modal.Heading><div className="mt-2 flex flex-wrap items-center gap-2">{product && product.source !== "tidb" && <Chip size="sm" color="default" variant="soft">MockAPI</Chip>}<p className="text-sm text-muted">{product ? "บันทึกการแก้ไขลงแหล่งข้อมูลเดิม" : "สินค้าใหม่จะแสดงบนหน้าร้าน"}</p></div></Modal.Header>
        <Modal.Body className="m-0 px-6 py-5">
          {error && <p role="alert" className="mb-4 rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>}
          <form id="product-editor" onSubmit={save}>
            <fieldset disabled={busy} className="space-y-6 disabled:opacity-70">
              <section className="space-y-4" aria-label="ข้อมูลสินค้า">
                <h3 className="font-semibold">ข้อมูลสินค้า</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium">ชื่อสินค้า *<input name="name" required maxLength={255} defaultValue={product?.name} onChange={(event) => { if (!slugEdited) setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")); }} className={productField} placeholder="เช่น AMD Ryzen 7 9800X3D" /></label>
                <label className="block text-sm font-medium">ลิงก์สินค้า (Slug) *<input name="slug" required maxLength={180} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={slug} onChange={(event) => { setSlugEdited(true); setSlug(event.target.value); }} className={productField} placeholder="amd-ryzen-7-9800x3d" /><span className="mt-1 block text-xs font-normal text-muted">/products/{slug || "ชื่อสินค้า"} · ใช้อักษรอังกฤษตัวเล็ก ตัวเลข และขีดกลาง</span></label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ComboBox name="brand" allowsCustomValue isRequired isDisabled={busy} inputValue={brand} onInputChange={setBrand} className="w-full min-w-0">
                    <Label className="text-sm font-medium">แบรนด์</Label>
                    <ComboBox.InputGroup className="min-h-10 rounded-lg">{brand.trim() && <span aria-hidden="true" className="pointer-events-none absolute left-3 z-10 grid h-6 w-12 place-items-center"><BrandMark brand={brands.find((option) => option.toLocaleLowerCase() === brand.trim().toLocaleLowerCase()) ?? brand.trim()} compact /></span>}<Input maxLength={100} placeholder="ค้นหาหรือเลือกแบรนด์" className={`min-w-0 ${brand.trim() ? "pl-16" : ""}`} /><ComboBox.Trigger aria-label="เลือกแบรนด์" /></ComboBox.InputGroup>
                    <ComboBox.Popover><ListBox renderEmptyState={() => <p className="p-3 text-sm text-muted">พิมพ์ชื่อเพื่อใช้แบรนด์ใหม่</p>}>{brands.map((brand) => <ListBox.Item key={brand} id={brand} textValue={brand}><span aria-hidden="true" className="grid h-6 w-12 shrink-0 place-items-center"><BrandMark brand={brand} compact /></span><span className="min-w-0 flex-1 truncate">{brand}</span><ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></ComboBox.Popover>
                  </ComboBox>
                  <ProductCategoryPicker categories={categories} value={category} onChange={changeCategory} disabled={busy} />
                </div>
              </section>
              <ProductPricing product={product} pending={busy} fieldClassName={productField} />
              <section className="space-y-4 border-t border-border pt-5" aria-label="สต็อกและการรับประกัน">
                <h3 className="font-semibold">สต็อกและการรับประกัน</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium">สต็อก (ชิ้น) *<input name="stock" type="number" required min={0} max={1000000} step="1" defaultValue={product?.stock ?? 0} className={productField} /><span className="mt-1 block text-xs font-normal text-muted">สต็อก 0 จะแสดงสินค้าหมด</span></label>
                  <div>
                    <span className="block text-sm font-medium">การรับประกัน</span>
                    <div className="mt-1.5 grid grid-cols-[6rem_7.5rem] gap-2">
                      <input type="number" inputMode="numeric" min={1} max={999} step={1} aria-label="ระยะเวลารับประกัน" value={warrantyAmount} onChange={(event) => setWarrantyAmount(event.target.value)} className={`${productField} !mt-0`} placeholder="เช่น 3" />
                      <ProductSelect label="หน่วยการรับประกัน" value={warrantyUnit} onChange={setWarrantyUnit} options={[{ value: "เดือน", label: "เดือน" }, { value: "ปี", label: "ปี" }]} disabled={busy} />
                    </div>
                    {warrantyInit.legacy && !warrantyAmount && <span className="mt-1 block text-xs font-normal text-muted">ค่าเดิม: {warrantyInit.legacy} · กรอกตัวเลขเพื่อเปลี่ยนเป็นเดือน/ปี</span>}
                  </div>
                </div>
              </section>
              <section className="space-y-4 border-t border-border pt-5" aria-label="รูปภาพและรายละเอียด">
                <h3 className="font-semibold">รูปภาพและรายละเอียด</h3>
                <ProductImages images={images} draftId={draftId} onChange={changeImages} pending={pending} onUploadingChange={setUploading} />
                <label className="block text-sm font-medium">รายละเอียด<textarea name="description" rows={4} maxLength={20000} defaultValue={product?.description ?? ""} className={`${productField} resize-y`} /></label>
                <fieldset>
                  <legend className="text-sm font-medium">ป้ายกำกับ</legend>
                  <div className="mt-2 flex flex-wrap gap-3">{PRODUCT_TAGS.map((tag) => <Checkbox key={tag.value} name="tags" value={tag.value} defaultSelected={product?.tags?.includes(tag.value)} isDisabled={busy}>
                    <Checkbox.Content className="gap-2 rounded-lg border border-border px-3 py-2">
                      <Checkbox.Control><Checkbox.Indicator /></Checkbox.Control>
                      <Label className="text-sm font-normal">{tag.label}</Label>
                    </Checkbox.Content>
                  </Checkbox>)}</div>
                </fieldset>
              </section>
              <ProductSpecifications templates={templatesFor(category)} specifications={specifications} legacyHighlights={legacyHighlights} onSpecificationsChange={(rows) => setSpecificationData((current) => ({ ...current, specifications: rows }))} onLegacyHighlightsChange={(rows) => setSpecificationData((current) => ({ ...current, legacyHighlights: rows }))} pending={busy} fieldClassName={productField} />
            </fieldset>
          </form>
        </Modal.Body>
        <Modal.Footer className="flex justify-end gap-4 border-t border-border px-6 py-4"><button type="button" disabled={busy} onClick={onClose} className="text-sm text-muted disabled:opacity-50">ยกเลิก</button><button type="submit" form="product-editor" disabled={busy} className={productPrimary}>{uploading ? "กำลังอัปโหลดรูป…" : pending ? "กำลังบันทึก…" : "บันทึกสินค้า"}</button></Modal.Footer>
      </Modal.Dialog>
    </Modal.Container>
  </Modal.Backdrop>;
}
