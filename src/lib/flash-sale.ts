export type FlashSaleSettings = { enabled: boolean; startsAt: string | null; endsAt: string | null };
export const DEFAULT_FLASH_SALE: FlashSaleSettings = { enabled: true, startsAt: null, endsAt: null };
export class FlashSaleInputError extends Error {}

export function validateFlashSaleSettings(value: unknown): FlashSaleSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new FlashSaleInputError("ข้อมูลเวลาไม่ถูกต้อง");
  const data = value as Record<string, unknown>;
  if (typeof data.enabled !== "boolean") throw new FlashSaleInputError("กรุณาระบุสถานะเปิดใช้งาน");
  function date(key: string) {
    const value = data[key];
    if (value === null) return null;
    // An explicit offset is required: never interpret an admin date in the server timezone.
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) throw new FlashSaleInputError("วันและเวลาไม่ถูกต้อง");
    return new Date(value).toISOString();
  }
  const startsAt = date("startsAt"); const endsAt = date("endsAt");
  if (!!startsAt !== !!endsAt) throw new FlashSaleInputError("กรุณาระบุเวลาเริ่มและสิ้นสุดให้ครบ หรือเว้นว่างทั้งสองช่อง");
  if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) throw new FlashSaleInputError("เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม");
  return { enabled: data.enabled, startsAt, endsAt };
}

/** datetime-local fields are explicitly shown and interpreted in Bangkok time (UTC+7). */
export function bangkokDateInput(iso: string | null) {
  return iso ? new Date(Date.parse(iso) + 7 * 3600_000).toISOString().slice(0, 16) : "";
}
export function bangkokInputToISO(value: string) {
  return value ? new Date(`${value}+07:00`).toISOString() : null;
}
export function flashSaleWindow(settings: FlashSaleSettings, now: number) {
  const starts = settings.startsAt ? Date.parse(settings.startsAt) : null;
  const ends = settings.endsAt ? Date.parse(settings.endsAt) : null;
  const active = settings.enabled && (starts === null || now >= starts) && (ends === null || now < ends);
  // Legacy daily mode expires at midnight in Bangkok, regardless of the viewer's timezone.
  const dailyEnd = (Math.floor((now + 7 * 3600_000) / 86400_000) + 1) * 86400_000 - 7 * 3600_000;
  return { active, endsAt: ends ?? dailyEnd, secondsLeft: Math.max(0, Math.ceil(((ends ?? dailyEnd) - now) / 1000)) };
}

export type FlashSaleOffer = { productId: string; price: number };
export type ProductFlashSale = FlashSaleSettings & { price: number; regularPrice: number; regularOriginalPrice: number };

export function validateFlashSalePrice(value: unknown, regularPrice: number) {
  if (!Number.isFinite(regularPrice) || regularPrice <= 0 || typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value >= regularPrice || Math.abs(value * 100 - Math.round(value * 100)) > 0.00001) {
    throw new FlashSaleInputError("ราคาแฟลชเซลต้องมากกว่า 0 น้อยกว่าราคาปกติ และมีทศนิยมไม่เกิน 2 ตำแหน่ง");
  }
  return value;
}

/** Always derive from the saved regular price, including after a sale expires on an open page. */
export function withFlashSalePrice<T extends { price: number; originalPrice: number; discount: number; flashSale?: ProductFlashSale }>(product: T, now: number): T {
  const offer = product.flashSale;
  if (!offer) return product;
  const active = flashSaleWindow(offer, now).active && offer.price > 0 && offer.price < offer.regularPrice;
  const price = active ? offer.price : offer.regularPrice;
  const originalPrice = active ? offer.regularPrice : offer.regularOriginalPrice;
  return { ...product, price, originalPrice, discount: originalPrice > 0 ? Math.round((1 - price / originalPrice) * 100) : 0 };
}
