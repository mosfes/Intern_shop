import type { Category, CategorySlug } from "@/lib/types";
import { categoryPhoto } from "./photos";

export const categories: Category[] = [
  { slug: "cpu", name: "CPU", nameTh: "ซีพียู", description: "หน่วยประมวลผลรุ่นล่าสุดจาก AMD และ Intel", image: categoryPhoto["cpu"] },
  { slug: "gpu", name: "Graphics Card", nameTh: "การ์ดจอ", description: "การ์ดจอสำหรับเกมและงานครีเอทีฟ", image: categoryPhoto["gpu"] },
  { slug: "ram", name: "Memory", nameTh: "แรม", description: "DDR5 ความเร็วสูง พร้อม RGB", image: categoryPhoto["ram"] },
  { slug: "ssd", name: "SSD", nameTh: "เอสเอสดี", description: "NVMe PCIe 4.0 / 5.0 แรงสุดขีด", image: categoryPhoto["ssd"] },
  { slug: "motherboard", name: "Motherboard", nameTh: "เมนบอร์ด", description: "รองรับซีพียูรุ่นใหม่ทุกแพลตฟอร์ม", image: categoryPhoto["motherboard"] },
  { slug: "psu", name: "Power Supply", nameTh: "พาวเวอร์ซัพพลาย", description: "จ่ายไฟเสถียร มาตรฐาน 80 PLUS", image: categoryPhoto["psu"] },
  { slug: "cooling", name: "Cooling", nameTh: "ชุดระบายความร้อน", description: "ชุดน้ำ AIO และฮีตซิงก์ลม", image: categoryPhoto["cooling"] },
  { slug: "case", name: "PC Case", nameTh: "เคสคอมพิวเตอร์", description: "เคสดีไซน์สวย ระบายอากาศดี", image: categoryPhoto["case"] },
  { slug: "monitor", name: "Monitor", nameTh: "จอมอนิเตอร์", description: "OLED, IPS รีเฟรชเรตสูง", image: categoryPhoto["monitor"] },
  { slug: "gaming-gear", name: "Gaming Gear", nameTh: "เกมมิ่งเกียร์", description: "เมาส์ คีย์บอร์ด หูฟัง ระดับโปร", image: categoryPhoto["gaming-gear"] },
];

export const categoryMap = Object.fromEntries(categories.map((c) => [c.slug, c])) as Record<
  CategorySlug,
  Category
>;

export function isCategorySlug(value: string | null | undefined): value is CategorySlug {
  return !!value && value in categoryMap;
}
