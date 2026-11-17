export type PromotionPlacement = "HERO" | "SIDE" | "BANNER";
export type PromotionTheme = "light" | "dark";

export type Promotion = {
  id: string;
  placement: PromotionPlacement;
  position: number;
  active: boolean;
  /** Hero: badge ("มาใหม่"). Side/banner: small label above the title. */
  tag: string;
  /** Hero only: line above the title ("GeForce RTX 50 Series"). */
  eyebrow: string;
  title: string;
  /** Hero only: the accented price line under the title. */
  highlight: string;
  description: string;
  image: string;
  ctaLabel: string;
  ctaHref: string;
  /** Hero only: the outlined second button. */
  secondaryLabel: string;
  secondaryHref: string;
  /** Side card only: light (cream) or dark background. */
  theme: PromotionTheme;
};

export type PromotionInput = Omit<Promotion, "id" | "position">;

export const PROMOTION_PLACEMENTS: { id: PromotionPlacement; label: string; description: string; limit: number }[] = [
  { id: "HERO", label: "สไลด์หลัก", description: "แบนเนอร์สไลด์ขนาดใหญ่ด้านบนหน้าแรก", limit: 8 },
  { id: "SIDE", label: "การ์ดข้างสไลด์", description: "การ์ดโปรโมชันด้านขวาของสไลด์หลัก มีได้ 2 ใบ", limit: 2 },
  { id: "BANNER", label: "แบนเนอร์โปรโมชัน", description: "แบนเนอร์คู่ใต้สินค้าแนะนำ มีได้ 2 ใบ", limit: 2 },
];
/** How many active items of each placement the homepage shows. */
export const PROMOTION_VISIBLE: Record<PromotionPlacement, number> = { HERO: 8, SIDE: 2, BANNER: 2 };

const blank = { tag: "", eyebrow: "", highlight: "", description: "", ctaLabel: "", secondaryLabel: "", secondaryHref: "", theme: "light" as const, active: true };

/** The original homepage content — seeded into the table and used if it cannot be read. */
export const DEFAULT_PROMOTIONS: Promotion[] = [
  { ...blank, id: "default-hero-1", placement: "HERO", position: 0, tag: "มาใหม่", eyebrow: "GeForce RTX 50 Series", title: "GeForce RTX 5070", highlight: "เริ่มต้น ฿22,900", description: "ASUS TUF Gaming RTX 5070 12GB รองรับ DLSS 4 เล่นเกม 1440p ได้สบาย ๆ", ctaLabel: "ช้อปการ์ดจอ", ctaHref: "/products?category=gpu", secondaryLabel: "ดู RTX 5070", secondaryHref: "/products/asus-tuf-geforce-rtx-5070", image: "/images/promotions/gpu-transparent.webp" },
  { ...blank, id: "default-hero-2", placement: "HERO", position: 1, tag: "โปรโมชั่น", eyebrow: "AMD Ryzen 9000X3D", title: "Ryzen 7 9800X3D", highlight: "เหลือ ฿17,990", description: "ลดจาก ฿19,500 ถึงสิ้นสัปดาห์นี้ ซีพียูสายเล่นเกมที่ได้เฟรมเรตสูงสุดตอนนี้ ด้วย 3D V-Cache", ctaLabel: "ซื้อเลย", ctaHref: "/products/amd-ryzen-7-9800x3d", secondaryLabel: "ซีพียูทั้งหมด", secondaryHref: "/products?category=cpu", image: "/images/promotions/cpu-transparent.webp" },
  { ...blank, id: "default-hero-3", placement: "HERO", position: 2, tag: "สายครีเอเตอร์", eyebrow: "จอ OLED 240Hz", title: "จอ OLED 27 นิ้ว 240Hz", highlight: "ราคา ฿26,900", description: "LG UltraGear OLED สีดำสนิท ตอบสนอง 0.03ms ใช้ได้ทั้งเล่นเกมและแต่งภาพ", ctaLabel: "ช้อปจอมอนิเตอร์", ctaHref: "/products?category=monitor", secondaryLabel: "LG UltraGear OLED", secondaryHref: "/products/lg-ultragear-27-oled-240hz", image: "/images/promotions/monitor-transparent.webp" },
  { ...blank, id: "default-side-1", placement: "SIDE", position: 0, tag: "โปรโมชั่น", title: "SSD NVMe ลดสูงสุด 16%", ctaHref: "/products?category=ssd", image: "/images/promotions/ssd-transparent.webp", theme: "light" },
  { ...blank, id: "default-side-2", placement: "SIDE", position: 1, tag: "อัปเกรดเซ็ตอัป", title: "เมาส์และคีย์บอร์ดเกมมิ่ง", ctaHref: "/products?category=gaming-gear", image: "/images/promotions/mouse-transparent.webp", theme: "dark" },
  { ...blank, id: "default-banner-1", placement: "BANNER", position: 0, title: "จัดสเปกคอมครบชุด รับส่วนลดเพิ่ม 5%", description: "เมื่อซื้อ CPU + เมนบอร์ด + แรม ในบิลเดียวกัน", ctaHref: "/pc-builder", image: "/images/promotions/motherboard-transparent.webp" },
  { ...blank, id: "default-banner-2", placement: "BANNER", position: 1, title: "ชุดระบายความร้อน เริ่มต้น ฿3,890", description: "ชุดน้ำ AIO 360mm และฮีตซิงก์ลมจาก Noctua, NZXT, ARCTIC", ctaHref: "/products?category=cooling", image: "/images/promotions/cooling-transparent.webp" },
];

export type HomepagePromotions = Record<PromotionPlacement, Promotion[]>;

export function groupPromotions(rows: Promotion[]): HomepagePromotions {
  const groups: HomepagePromotions = { HERO: [], SIDE: [], BANNER: [] };
  for (const row of [...rows].sort((a, b) => a.position - b.position)) if (row.active) groups[row.placement].push(row);
  for (const key of Object.keys(groups) as PromotionPlacement[]) groups[key] = groups[key].slice(0, PROMOTION_VISIBLE[key]);
  return groups;
}

export class PromotionError extends Error { constructor(message: string, public status = 400) { super(message); } }

/** Validates an admin form body. Links must be site paths or http(s) URLs; images must be uploaded or local. */
export function validatePromotion(body: Record<string, unknown>): PromotionInput {
  const placement = body.placement;
  if (placement !== "HERO" && placement !== "SIDE" && placement !== "BANNER") throw new PromotionError("กรุณาเลือกตำแหน่งที่แสดง");
  function text(key: string, max: number, required = false) {
    const value = body[key] ?? "";
    if (typeof value !== "string" || value.trim().length > max) throw new PromotionError("ข้อความยาวเกินที่กำหนด");
    if (required && !value.trim()) throw new PromotionError("กรุณากรอกข้อมูลที่จำเป็นให้ครบ");
    return value.trim();
  }
  function link(key: string, required: boolean) {
    const value = text(key, 500, required);
    if (value && !/^\/(?!\/)\S*$/.test(value) && !/^https?:\/\/\S+$/.test(value)) throw new PromotionError("ลิงก์ต้องขึ้นต้นด้วย / หรือ https://");
    return value;
  }
  const image = text("image", 2048, true);
  const base = process.env.NEXT_PUBLIC_IMAGE_BASE_URL?.replace(/\/+$/, "");
  if (!(/^\/(?!\/)[^\s\\]+$/.test(image) || (base && image.startsWith(`${base}/`) && !/[\s\\]/.test(image)))) throw new PromotionError("กรุณาใช้รูปที่อัปโหลดหรือรูปในเว็บไซต์");
  const hero = placement === "HERO";
  const secondaryLabel = hero ? text("secondaryLabel", 60) : "";
  const secondaryHref = hero ? link("secondaryHref", false) : "";
  if (secondaryHref && !secondaryLabel) throw new PromotionError("กรุณากรอกข้อความบนปุ่มรอง หรือล้างลิงก์ปุ่มรองออก");
  return {
    placement,
    active: body.active !== false,
    tag: text("tag", 60, placement !== "BANNER"),
    eyebrow: hero ? text("eyebrow", 120) : "",
    title: text("title", 160, true),
    highlight: hero ? text("highlight", 120) : "",
    description: placement === "SIDE" ? "" : text("description", 500),
    image,
    ctaLabel: placement === "SIDE" ? "" : text("ctaLabel", 60, hero),
    ctaHref: link("ctaHref", true),
    secondaryLabel: secondaryHref ? secondaryLabel : "",
    secondaryHref,
    theme: placement === "SIDE" && body.theme === "dark" ? "dark" : "light",
  };
}
