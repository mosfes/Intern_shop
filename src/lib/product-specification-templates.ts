import type { SpecificationDraft } from "./product-highlights";
import type { CategorySpecField } from "./types";

export type SpecificationTemplate = CategorySpecField;
export const MAX_CATEGORY_SPEC_FIELDS = 40;

// Starter sets for known category slugs. They seed the database once and prefill the
// category editor; after that, the admin-managed rows stored on each category win.
// Keep compatibility labels aligned with the fields read by checkBuild.
const templates: Record<string, SpecificationTemplate[]> = {
  cpu: [
    { label: "Socket", example: "AM5 หรือ LGA1700", compatibility: true },
    { label: "Cores / Threads", example: "8 / 16" },
    { label: "Base Clock", example: "4.2 GHz" },
    { label: "Boost Clock", example: "5.0 GHz" },
    { label: "TDP", example: "120 W" },
    { label: "Integrated Graphics", example: "AMD Radeon Graphics หรือ No" },
  ],
  motherboard: [
    { label: "Socket", example: "AM5 หรือ LGA1700", compatibility: true },
    { label: "Memory", example: "DDR5, 4 DIMM, สูงสุด 192 GB", compatibility: true },
    { label: "Form Factor", example: "ATX, Micro-ATX หรือ Mini-ITX (เลือกหนึ่งขนาด)", compatibility: true },
    { label: "Chipset", example: "B650" },
    { label: "Storage", example: "2 x M.2 PCIe 4.0, 4 x SATA" },
  ],
  ram: [
    { label: "Type", example: "DDR5 หรือ DDR4", compatibility: true },
    { label: "Capacity", example: "32 GB (2 x 16 GB)" },
    { label: "Speed", example: "6000 MHz" },
    { label: "Latency", example: "CL30" },
  ],
  gpu: [
    { label: "Recommended PSU", example: "750 W (ตามคำแนะนำผู้ผลิตการ์ดจอ)", powerAdvice: true },
    { label: "Dimensions", example: "300 x 120 x 50 mm (ความยาวเป็นตัวเลขแรก)", compatibility: true },
    { label: "GPU", example: "GeForce RTX 4070" },
    { label: "Memory", example: "12 GB GDDR6X" },
    { label: "Power Connector", example: "1 x 16-pin" },
  ],
  ssd: [
    { label: "Capacity", example: "1 TB" },
    { label: "Interface", example: "PCIe 4.0 x4 NVMe หรือ SATA III" },
    { label: "Form Factor", example: "M.2 2280 หรือ 2.5 inch" },
    { label: "Read Speed", example: "7000 MB/s" },
    { label: "Write Speed", example: "6000 MB/s" },
  ],
  psu: [
    { label: "Wattage", example: "850 W (กำลังไฟตามสเปก PSU)", powerAdvice: true },
    { label: "Efficiency", example: "80 PLUS Gold" },
    { label: "Modular", example: "Full Modular" },
    { label: "Standard", example: "ATX 3.0" },
    { label: "Form Factor", example: "ATX หรือ SFX" },
  ],
  cooling: [
    { label: "Socket Support", example: "AM5, AM4, LGA1700 (คั่นด้วยจุลภาค)", compatibility: true },
    { label: "Type", example: "Air Cooler หรือ AIO Liquid Cooler" },
    { label: "Height", example: "กรณีฮีตซิงก์ลม: 160 mm (ลบช่องนี้หากเป็นชุดน้ำ)", compatibility: true },
    { label: "Radiator", example: "กรณีชุดน้ำ: 360 mm (ลบช่องนี้หากเป็นฮีตซิงก์ลม)", compatibility: true },
  ],
  case: [
    { label: "Motherboard Support", example: "ATX, Micro-ATX, Mini-ITX (คั่นด้วยจุลภาค)", compatibility: true },
    { label: "GPU Clearance", example: "400 mm", compatibility: true },
    { label: "CPU Cooler Clearance", example: "170 mm", compatibility: true },
    { label: "Radiator Support", example: "360 mm (ขนาดสูงสุด)", compatibility: true },
    { label: "Form Factor", example: "Mid Tower" },
  ],
  monitor: [
    { label: "Size", example: "27 inch" },
    { label: "Resolution", example: "2560 x 1440" },
    { label: "Refresh Rate", example: "165 Hz" },
    { label: "Panel", example: "IPS, VA หรือ OLED" },
    { label: "Ports", example: "HDMI 2.1, DisplayPort 1.4" },
  ],
  "gaming-gear": [
    { label: "Type", example: "Mouse, Keyboard หรือ Headset" },
    { label: "Connectivity", example: "USB, Bluetooth หรือ Wireless 2.4 GHz" },
    { label: "Weight", example: "60 g" },
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
