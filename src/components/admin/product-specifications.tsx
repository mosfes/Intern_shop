"use client";

import { Checkbox, Label } from "@heroui/react";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { buildProductHighlights, MAX_PRODUCT_HIGHLIGHTS, specificationHighlight, type LegacyHighlight, type SpecificationDraft } from "@/lib/product-highlights";

import { addSpecificationDefaults, type SpecificationTemplate } from "@/lib/product-specification-templates";

type Props = {
  /** Default spec rows of the selected category (managed in หมวดหมู่). */
  templates: SpecificationTemplate[];
  specifications: SpecificationDraft[];
  legacyHighlights: LegacyHighlight[];
  onSpecificationsChange: (rows: SpecificationDraft[]) => void;
  onLegacyHighlightsChange: (rows: LegacyHighlight[]) => void;
  pending: boolean;
  fieldClassName: string;
};

export function ProductSpecifications({ templates, specifications, legacyHighlights, onSpecificationsChange, onLegacyHighlightsChange, pending, fieldClassName }: Props) {
  const missingDefaults = templates.some((field) => !specifications.some((row) => row.label.trim().toLowerCase() === field.label.toLowerCase()));
  const highlights = buildProductHighlights(specifications, legacyHighlights);
  return <section className="space-y-3 border-t border-border pt-5" aria-label="สเปกโดยละเอียด">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="font-semibold">สเปกโดยละเอียด</h3>
      <button type="button" disabled={pending || specifications.length >= 80} onClick={() => onSpecificationsChange([...specifications, { id: crypto.randomUUID(), label: "", value: "", highlighted: false }])} className="inline-flex items-center gap-1 text-sm text-accent disabled:opacity-50"><PlusIcon size={16} />เพิ่มสเปก</button>
    </div>
    <p className="text-xs text-muted">ติ๊ก “ใช้เป็นจุดเด่น” ที่แถวสเปกที่ต้องการ · เลือกแล้ว {highlights.length}/{MAX_PRODUCT_HIGHLIGHTS} รายการ</p>
    <p className="text-xs text-muted">เลือกหมวดหมู่เพื่อแสดงช่องสเปกเริ่มต้น (ตั้งค่าได้ที่เมนูจัดการหมวดหมู่) แก้ไขชื่อ เพิ่ม หรือลบช่องที่ไม่ใช้ได้ ช่องที่คงไว้ต้องกรอกให้ครบ</p>
    {!!templates.length && <div className="space-y-2 rounded-lg bg-accent-soft/50 p-3"><p className="text-xs text-muted">ช่องที่ระบุ “ใช้ตรวจความเข้ากันได้” ควรใช้ชื่อเดิมและกรอกค่าตามรูปแบบตัวอย่าง หากลบหรือเปลี่ยนชื่อ ระบบอาจตรวจสอบไม่ได้</p><button type="button" disabled={pending || !missingDefaults || specifications.length >= 80} onClick={() => onSpecificationsChange(addSpecificationDefaults(templates, specifications))} className="text-sm text-accent disabled:opacity-50">เพิ่มช่องเริ่มต้นที่ขาด</button></div>}
    {!specifications.length && <p className="text-sm text-muted">เพิ่มชื่อและค่าของสเปก เช่น Socket / AM5</p>}
    {specifications.map((spec, index) => {
      const template = templates.find((field) => field.label.toLowerCase() === spec.label.trim().toLowerCase());
      const text = specificationHighlight(spec);
      const tooLong = text.length > 1000;
      return <div key={spec.id} className={`rounded-lg border p-3 ${spec.highlighted ? "border-accent/40 bg-accent-soft/30" : "border-border"}`}>
        <div className="grid grid-cols-2 items-center gap-x-3 gap-y-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
          <input aria-label={`ชื่อสเปก ${index + 1}`} required maxLength={120} value={spec.label} onChange={(event) => onSpecificationsChange(specifications.map((row) => row.id === spec.id ? { ...row, label: event.target.value } : row))} className={`${fieldClassName} min-w-0`} placeholder="ชื่อสเปก" />
          <input aria-label={`ค่าสเปก ${index + 1}`} aria-describedby={template ? `spec-hint-${spec.id}` : undefined} required maxLength={1000} value={spec.value} onChange={(event) => onSpecificationsChange(specifications.map((row) => row.id === spec.id ? { ...row, value: event.target.value } : row))} className={`${fieldClassName} min-w-0`} placeholder={template?.example ? `เช่น ${template.example}` : "ค่า"} />
          <Checkbox aria-label={`ใช้เป็นจุดเด่น สเปก ${index + 1}`} isSelected={spec.highlighted} isDisabled={pending || (!spec.highlighted && (!text || tooLong || highlights.length >= MAX_PRODUCT_HIGHLIGHTS))} onChange={(selected) => onSpecificationsChange(specifications.map((row) => row.id === spec.id ? { ...row, highlighted: selected } : row))}>
            <Checkbox.Content className="gap-2 py-2"><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Label className="whitespace-nowrap text-xs font-normal">ใช้เป็นจุดเด่น</Label></Checkbox.Content>
          </Checkbox>
          <button type="button" disabled={pending} aria-label={`ลบสเปก ${index + 1}`} onClick={() => onSpecificationsChange(specifications.filter((row) => row.id !== spec.id))} className="justify-self-end rounded-lg p-2 text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-50"><TrashIcon size={17} /></button>
        </div>
        {template && (template.compatibility || template.powerAdvice || template.hint || template.example) && <p id={`spec-hint-${spec.id}`} className="mt-2 text-xs text-muted">{template.compatibility && <span className="mr-2 text-accent">ใช้ตรวจความเข้ากันได้</span>}{template.powerAdvice && <span className="mr-2 text-accent">ใช้แสดงคำแนะนำกำลังไฟ</span>}{template.hint}{template.hint && template.example && " · "}{template.example && <>เช่น {template.example}</>}</p>}
        {tooLong && <p className="mt-2 text-xs text-danger">ย่อข้อความให้ไม่เกิน 1,000 ตัวอักษรก่อนเลือกเป็นจุดเด่น</p>}
      </div>;
    })}
    {!!legacyHighlights.length && <details className="border-t border-border pt-3">
      <summary className="text-xs text-muted">จุดเด่นที่บันทึกไว้เดิม ({legacyHighlights.filter((row) => row.selected).length} รายการ)</summary>
      <p className="mt-2 text-xs text-muted">รายการเดิมยังคงอยู่ เลิกติ๊กเพื่อนำออกได้</p>
      <div className="mt-2 space-y-1">{legacyHighlights.map((highlight, index) => <Checkbox key={index} isSelected={highlight.selected} isDisabled={pending || (!highlight.selected && highlights.length >= MAX_PRODUCT_HIGHLIGHTS)} onChange={(selected) => onLegacyHighlightsChange(legacyHighlights.map((row, i) => i === index ? { ...row, selected } : row))}><Checkbox.Content className="items-start gap-2 py-1"><Checkbox.Control className="mt-0.5 shrink-0"><Checkbox.Indicator /></Checkbox.Control><Label className="min-w-0 break-words text-sm font-normal">{highlight.text}</Label></Checkbox.Content></Checkbox>)}</div>
    </details>}
  </section>;
}
