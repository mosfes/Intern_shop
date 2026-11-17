import type { Product } from "./types";

export const buildSlots = [
  { key: "cpu", name: "ซีพียู", hint: "CPU" },
  { key: "motherboard", name: "เมนบอร์ด", hint: "Motherboard" },
  { key: "ram", name: "แรม", hint: "Memory" },
  { key: "gpu", name: "การ์ดจอ", hint: "Graphics card" },
  { key: "ssd", name: "เอสเอสดี", hint: "Storage" },
  { key: "psu", name: "พาวเวอร์ซัพพลาย", hint: "Power supply" },
  { key: "cooling", name: "ชุดระบายความร้อน", hint: "CPU cooler" },
  { key: "case", name: "เคสคอมพิวเตอร์", hint: "PC case" },
] as const;

export type BuildSlot = (typeof buildSlots)[number]["key"];
export type PcBuild = Partial<Record<BuildSlot, string>>;
export type BuildParts = Partial<Record<BuildSlot, Product>>;
export interface CompatibilityCheck { label: string; status: "pass" | "error" | "unknown"; message: string }

function spec(product: Product | undefined, label: string) {
  return product?.specifications.find((s) => s.label.toLowerCase() === label.toLowerCase())?.value.toUpperCase() ?? "";
}
const socket = (value: string) => value.match(/AM[345]|LGA\s?\d+/)?.[0].replace(/\s/g, "");
const ddr = (value: string) => value.match(/DDR[345]/)?.[0];
const number = (value: string) => Number(value.match(/\d+(?:\.\d+)?/)?.[0]) || 0;

export function powerSupplyAdvice(parts: BuildParts): string | null {
  if (!parts.gpu || !parts.psu) return null;
  const recommended = number(spec(parts.gpu, "Recommended PSU"));
  const watts = number(spec(parts.psu, "Wattage"));
  if (!recommended || !watts) return "ข้อมูลกำลังไฟไม่เพียงพอ กรุณาตรวจสอบคำแนะนำ PSU ของผู้ผลิตการ์ดจอและการใช้ไฟของอุปกรณ์ทั้งชุด";
  return `เลือก PSU ${watts}W · ผู้ผลิตการ์ดจอแนะนำอย่างน้อย ${recommended}W${watts < recommended ? " · PSU ที่เลือกต่ำกว่าคำแนะนำ" : ""} · ควรตรวจสอบการใช้ไฟของอุปกรณ์ทั้งชุดเพิ่มเติม`;
}

/** Only catalogue specifications are checked; missing values never count as a pass. */
export function checkBuild(parts: BuildParts): CompatibilityCheck[] {
  const checks: CompatibilityCheck[] = [];
  const compare = (label: string, known: boolean, compatible: boolean, pass: string, fail: string) => {
    checks.push({ label, status: !known ? "unknown" : compatible ? "pass" : "error", message: !known ? "ข้อมูลไม่เพียงพอ กรุณาตรวจสอบกับผู้ขาย" : compatible ? pass : fail });
  };
  if (parts.cpu && parts.motherboard) {
    const a = socket(spec(parts.cpu, "Socket")), b = socket(spec(parts.motherboard, "Socket"));
    compare("ซ็อกเก็ต CPU / เมนบอร์ด", !!a && !!b, a === b, `ซ็อกเก็ต ${a} ตรงกัน`, `CPU ${a} ใช้กับเมนบอร์ด ${b} ไม่ได้`);
  }
  if (parts.ram && parts.motherboard) {
    const a = ddr(spec(parts.ram, "Type")), b = ddr(spec(parts.motherboard, "Memory"));
    compare("ประเภทแรม", !!a && !!b, a === b, `รองรับแรม ${a}`, `แรม ${a} ไม่ตรงกับเมนบอร์ด ${b}`);
  }
  if (parts.cpu && parts.cooling) {
    const a = socket(spec(parts.cpu, "Socket")), b = spec(parts.cooling, "Socket Support").replace(/\s/g, "");
    compare("ซ็อกเก็ตชุดระบายความร้อน", !!a && !!b, !!a && b.split(/[,/;]+/).includes(a), `ชุดระบายความร้อนรองรับ ${a}`, `ชุดระบายความร้อนไม่รองรับ ${a}`);
  }
  if (parts.case && parts.gpu) {
    const length = number(spec(parts.gpu, "Dimensions")), clearance = number(spec(parts.case, "GPU Clearance"));
    compare("ความยาวการ์ดจอ / เคส", !!length && !!clearance, length <= clearance, `การ์ดจอยาว ${length} มม. / เคสรองรับ ${clearance} มม.`, `การ์ดจอยาว ${length} มม. เกินพื้นที่เคส ${clearance} มม.`);
  }
  if (parts.case && parts.motherboard) {
    const form = spec(parts.motherboard, "Form Factor"), supported = spec(parts.case, "Motherboard Support");
    compare("ขนาดเมนบอร์ด / เคส", !!form && !!supported, supported.split(/[,/;]+/).some((s) => s.trim() === form), `เคสรองรับ ${form}`, `เคสไม่รองรับเมนบอร์ด ${form}`);
  }
  if (parts.case && parts.cooling) {
    const radiator = number(spec(parts.cooling, "Radiator")), height = number(spec(parts.cooling, "Height"));
    const limit = number(spec(parts.case, radiator ? "Radiator Support" : "CPU Cooler Clearance"));
    compare("พื้นที่ชุดระบายความร้อน / เคส", !!limit && !!(radiator || height), (radiator || height) <= limit, "ขนาดชุดระบายความร้อนอยู่ในข้อจำกัดเคส", "ชุดระบายความร้อนมีขนาดเกินข้อจำกัดเคส");
  }
  return checks;
}
