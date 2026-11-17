const DIGITS = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const PLACES = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];

/** Reads a whole number in Thai. `trailing` is true when higher digits precede it (e.g. after "ล้าน"), which turns a final 1 into "เอ็ด". */
function readInteger(value: number, trailing = false): string {
  if (value >= 1_000_000) {
    const millions = Math.floor(value / 1_000_000);
    return `${readInteger(millions, trailing)}ล้าน${readInteger(value % 1_000_000, true)}`;
  }
  const digits = String(value).split("").map(Number);
  return digits.map((digit, index) => {
    const place = digits.length - 1 - index;
    if (digit === 0) return "";
    if (place === 1) return digit === 1 ? "สิบ" : digit === 2 ? "ยี่สิบ" : `${DIGITS[digit]}สิบ`;
    if (place === 0 && digit === 1 && (trailing || digits.length > 1)) return "เอ็ด";
    return `${DIGITS[digit]}${PLACES[place]}`;
  }).join("");
}

/** A baht amount written out in Thai, as on Thai receipts: 1,250.50 → "หนึ่งพันสองร้อยห้าสิบบาทห้าสิบสตางค์". */
export function bahtText(amount: number) {
  const satangTotal = Math.round(Math.abs(amount) * 100);
  const baht = Math.floor(satangTotal / 100);
  const satang = satangTotal % 100;
  const bahtPart = baht ? `${readInteger(baht)}บาท` : satang ? "" : "ศูนย์บาท";
  return `${amount < 0 ? "ลบ" : ""}${bahtPart}${satang ? `${readInteger(satang)}สตางค์` : "ถ้วน"}`;
}
