import type { SpecificationDraft } from "./product-highlights";
import type { CategorySpecField } from "./types";

export type SpecificationTemplate = CategorySpecField;
export const MAX_CATEGORY_SPEC_FIELDS = 40;

// Starter sets for known category slugs. They seed the database once and prefill the
// category editor; after that, the admin-managed rows stored on each category win.
// Keep compatibility labels aligned with the fields read by checkBuild.
const templates: Record<string, SpecificationTemplate[]> = {
  cpu: [
    { label: "Socket", example: "AM5 หรือ LGA1700", hint: "ประเภทขาเสียบ CPU ต้องตรงกับเมนบอร์ด", compatibility: true },
    { label: "Cores / Threads", example: "8 / 16", hint: "จำนวนคอร์ / จำนวนเธรด" },
    { label: "Base Clock", example: "4.2 GHz", hint: "ความเร็วพื้นฐานของ CPU (GHz)" },
    { label: "Boost Clock", example: "5.0 GHz", hint: "ความเร็วสูงสุดเมื่อบูสต์ (GHz)" },
    { label: "TDP", example: "120 W", hint: "กำลังไฟ/ความร้อนที่ออกแบบไว้ (วัตต์)" },
    { label: "Integrated Graphics", example: "AMD Radeon Graphics หรือ No", hint: "การ์ดจอในตัว CPU ถ้าไม่มีให้ใส่ No" },
  ],
  motherboard: [
    { label: "Socket", example: "AM5 หรือ LGA1700", hint: "ซ็อกเก็ต CPU ที่บอร์ดรองรับ ต้องตรงกับ CPU", compatibility: true },
    { label: "Memory", example: "DDR5, 4 DIMM, สูงสุด 192 GB", hint: "ชนิดแรม, จำนวนสล็อต, ความจุสูงสุด · ขึ้นต้นด้วยชนิดแรม (DDR4/DDR5) เพื่อใช้ตรวจกับแรม", compatibility: true },
    { label: "Form Factor", example: "ATX", hint: "ขนาดบอร์ด เลือกหนึ่งขนาด: ATX, Micro-ATX หรือ Mini-ITX · ใช้ตรวจกับเคส", compatibility: true },
    { label: "Chipset", example: "B650", hint: "ชิปเซ็ตของเมนบอร์ด" },
    { label: "Storage", example: "2 x M.2 PCIe 4.0, 4 x SATA", hint: "จำนวนและชนิดช่องเก็บข้อมูล" },
  ],
  ram: [
    { label: "Type", example: "DDR5 หรือ DDR4", hint: "รุ่นของแรม ต้องตรงกับเมนบอร์ด", compatibility: true },
    { label: "Capacity", example: "32 GB (2 x 16 GB)", hint: "ความจุรวม (จำนวนแท่ง x ความจุต่อแท่ง)" },
    { label: "Speed", example: "6000 MHz", hint: "ความเร็วบัส (MHz)" },
    { label: "Latency", example: "CL30", hint: "ค่าหน่วง CL ยิ่งต่ำยิ่งตอบสนองเร็ว" },
  ],
  gpu: [
    { label: "Recommended PSU", example: "750 W", hint: "กำลังไฟ PSU ที่ผู้ผลิตแนะนำ (วัตต์) · ใช้แสดงคำแนะนำกำลังไฟ", powerAdvice: true },
    { label: "Dimensions", example: "300 x 120 x 50 mm", hint: "ยาว x กว้าง x สูง (มม.) · ตัวเลขแรกต้องเป็นความยาวการ์ด ใช้ตรวจว่าใส่เคสได้ไหม", compatibility: true },
    { label: "GPU", example: "GeForce RTX 4070", hint: "รุ่นชิปกราฟิก" },
    { label: "Memory", example: "12 GB GDDR6X", hint: "ขนาดและชนิดหน่วยความจำการ์ดจอ" },
    { label: "Power Connector", example: "1 x 16-pin", hint: "ช่องต่อไฟที่การ์ดจอต้องใช้" },
  ],
  ssd: [
    { label: "Capacity", example: "1 TB", hint: "ความจุ (GB หรือ TB)" },
    { label: "Interface", example: "PCIe 4.0 x4 NVMe หรือ SATA III", hint: "รูปแบบการเชื่อมต่อกับเมนบอร์ด" },
    { label: "Form Factor", example: "M.2 2280 หรือ 2.5 inch", hint: "ขนาดตัวไดรฟ์" },
    { label: "Read Speed", example: "7000 MB/s", hint: "ความเร็วอ่านต่อเนื่อง (MB/s)" },
    { label: "Write Speed", example: "6000 MB/s", hint: "ความเร็วเขียนต่อเนื่อง (MB/s)" },
  ],
  psu: [
    { label: "Wattage", example: "850 W", hint: "กำลังไฟสูงสุดที่จ่ายได้ (วัตต์) · ใช้เทียบกับกำลังไฟที่การ์ดจอแนะนำ", powerAdvice: true },
    { label: "Efficiency", example: "80 PLUS Gold", hint: "ระดับประสิทธิภาพ 80 PLUS" },
    { label: "Modular", example: "Full Modular", hint: "ชนิดสายไฟ: Non-Modular, Semi-Modular หรือ Full Modular" },
    { label: "Standard", example: "ATX 3.0", hint: "มาตรฐาน ATX ที่รองรับ" },
    { label: "Form Factor", example: "ATX หรือ SFX", hint: "ขนาดตัว PSU" },
  ],
  cooling: [
    { label: "Socket Support", example: "AM5, AM4, LGA1700", hint: "ซ็อกเก็ต CPU ที่รองรับ คั่นด้วยจุลภาค", compatibility: true },
    { label: "Type", example: "Air Cooler หรือ AIO Liquid Cooler", hint: "ชนิดชุดระบายความร้อน: ฮีตซิงก์ลม หรือ ชุดน้ำ" },
    { label: "Height", example: "160 mm", hint: "ความสูงฮีตซิงก์ (มม.) · ใช้เฉพาะชุดลม ลบช่องนี้หากเป็นชุดน้ำ", compatibility: true },
    { label: "Radiator", example: "360 mm", hint: "ขนาดหม้อน้ำ (มม.) · ใช้เฉพาะชุดน้ำ ลบช่องนี้หากเป็นฮีตซิงก์ลม", compatibility: true },
  ],
  case: [
    { label: "Motherboard Support", example: "ATX, Micro-ATX, Mini-ITX", hint: "ขนาดเมนบอร์ดที่ใส่ได้ คั่นด้วยจุลภาค", compatibility: true },
    { label: "GPU Clearance", example: "400 mm", hint: "ความยาวการ์ดจอสูงสุดที่ใส่ได้ (มม.)", compatibility: true },
    { label: "CPU Cooler Clearance", example: "170 mm", hint: "ความสูงฮีตซิงก์ CPU สูงสุดที่ใส่ได้ (มม.)", compatibility: true },
    { label: "Radiator Support", example: "360 mm", hint: "ขนาดหม้อน้ำสูงสุดที่ติดตั้งได้ (มม.)", compatibility: true },
    { label: "Form Factor", example: "Mid Tower", hint: "ขนาดเคส เช่น Mini Tower, Mid Tower, Full Tower" },
  ],
  monitor: [
    { label: "Size", example: "27 inch", hint: "ขนาดหน้าจอ (นิ้ว)" },
    { label: "Resolution", example: "2560 x 1440", hint: "ความละเอียด กว้าง x สูง (พิกเซล)" },
    { label: "Refresh Rate", example: "165 Hz", hint: "อัตรารีเฟรช (Hz)" },
    { label: "Panel", example: "IPS, VA หรือ OLED", hint: "ชนิดแผงจอ" },
    { label: "Ports", example: "HDMI 2.1, DisplayPort 1.4", hint: "พอร์ตเชื่อมต่อที่มี คั่นด้วยจุลภาค" },
  ],
  "gaming-gear": [
    { label: "Type", example: "Mouse, Keyboard หรือ Headset", hint: "ประเภทอุปกรณ์" },
    { label: "Connectivity", example: "USB, Bluetooth หรือ Wireless 2.4 GHz", hint: "รูปแบบการเชื่อมต่อ" },
    { label: "Weight", example: "60 g", hint: "น้ำหนัก (กรัม)" },
  ],
};

/** Built-in starter fields for a known category slug (empty for custom categories). */
export function builtInSpecFields(slug: string): SpecificationTemplate[] {
  return Object.hasOwn(templates, slug) ? templates[slug].map((field) => ({ ...field })) : [];
}

export const builtInSpecSlugs = () => Object.keys(templates);

/** Adds any default field the product does not already have, as empty rows. */
export function addSpecificationDefaults(fields: SpecificationTemplate[], rows: SpecificationDraft[]): SpecificationDraft[] {
  const labels = new Set(rows.map((row) => row.label.trim().toLowerCase()));
  const missing = fields.filter((field) => !labels.has(field.label.toLowerCase()));
  return [...rows, ...missing.slice(0, Math.max(0, 80 - rows.length)).map((field) => ({
    id: crypto.randomUUID(), label: field.label, value: "", highlighted: false,
  }))];
}
