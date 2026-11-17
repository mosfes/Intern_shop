export type DiscountMode = "none" | "price" | "amount" | "percent";

/** Work in satang so saved prices and displayed savings agree. */
export function calculateProductPricing(originalPrice: number, mode: DiscountMode, adjustment = 0) {
  const isMoney = (value: number) => Number.isFinite(value) && value >= 0 && Math.abs(value * 100 - Math.round(value * 100)) < 0.00001;
  if (!isMoney(originalPrice) || originalPrice > 100_000_000) return null;
  if (mode !== "none" && (!Number.isFinite(adjustment) || adjustment < 0)) return null;
  if (mode === "percent" ? adjustment > 100 : mode !== "none" && (!isMoney(adjustment) || adjustment > originalPrice)) return null;

  const original = Math.round(originalPrice * 100);
  const price = mode === "none" ? original
    : mode === "price" ? Math.round(adjustment * 100)
    : mode === "amount" ? original - Math.round(adjustment * 100)
    : Math.round(original * (1 - adjustment / 100));
  const savings = original - price;
  return { price: price / 100, savings: savings / 100, percentage: original > 0 ? savings / original * 100 : 0 };
}
