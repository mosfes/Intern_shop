export function formatBaht(value: number) {
  return `฿${value.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 })}`;
}

const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/** Deterministic Thai date (no Intl locale differences between server and client). */
export function formatThaiDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${thaiMonths[m - 1]} ${y + 543}`;
}

export function stockStatus(stock: number) {
  if (stock <= 0) return { label: "สินค้าหมด", color: "danger" as const };
  if (stock <= 5) return { label: `เหลือ ${stock} ชิ้น`, color: "warning" as const };
  return { label: "มีสินค้า", color: "success" as const };
}

export const FREE_SHIPPING_THRESHOLD = 3000;

export const shippingOptions = [
  { id: "standard", label: "จัดส่งมาตรฐาน", description: "ได้รับภายใน 2–4 วันทำการ", price: 60 },
  { id: "express", label: "จัดส่งด่วน", description: "ได้รับภายใน 1–2 วันทำการ", price: 120 },
  { id: "pickup", label: "รับที่หน้าร้าน", description: "EDM PC Shop สาขาสยาม — พร้อมรับใน 2 ชม.", price: 0 },
] as const;

export type ShippingId = (typeof shippingOptions)[number]["id"];

export function shippingCost(id: ShippingId, subtotal: number) {
  const opt = shippingOptions.find((o) => o.id === id)!;
  if (id === "standard" && subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return opt.price;
}
