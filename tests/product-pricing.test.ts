import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateProductPricing } from "../src/lib/product-pricing";
import { formatBaht } from "../src/lib/format";

test("discount entry modes agree on the saved price and savings", () => {
  assert.deepEqual(calculateProductPricing(1000, "none"), { price: 1000, savings: 0, percentage: 0 });
  for (const [mode, value] of [["price", 800], ["amount", 200], ["percent", 20]] as const) {
    assert.deepEqual(calculateProductPricing(1000, mode, value), { price: 800, savings: 200, percentage: 20 });
  }
});

test("percentage pricing rounds to satang and savings match the stored price", () => {
  const result = calculateProductPricing(999.99, "percent", 15)!;
  assert.equal(result.price, 849.99);
  assert.equal(result.savings, 150);
  assert.ok(Math.abs(result.percentage - 15.00015) < 0.00001);
  assert.equal(calculateProductPricing(0.3, "amount", 0.1)?.price, 0.2);
  assert.equal(calculateProductPricing(199.99, "percent", 12.5)?.price, 174.99);
});

test("zero, full discounts and invalid input are handled explicitly", () => {
  assert.deepEqual(calculateProductPricing(0, "none"), { price: 0, savings: 0, percentage: 0 });
  assert.deepEqual(calculateProductPricing(1000, "percent", 100), { price: 0, savings: 1000, percentage: 100 });
  assert.equal(calculateProductPricing(NaN, "none"), null);
  assert.equal(calculateProductPricing(1000, "price", NaN), null);
  assert.equal(calculateProductPricing(-1, "none"), null);
  assert.equal(calculateProductPricing(1000, "percent", -1), null);
  assert.equal(calculateProductPricing(1000, "percent", 101), null);
  assert.equal(calculateProductPricing(1000, "amount", 1001), null);
  assert.equal(calculateProductPricing(1000, "price", 1001), null);
  assert.equal(calculateProductPricing(1000, "price", 0.001), null);
  assert.equal(calculateProductPricing(100_000_001, "none"), null);
});

test("storefront currency keeps satang from calculated discounts", () => {
  assert.equal(formatBaht(1000), "฿1,000");
  assert.equal(formatBaht(849.99), "฿849.99");
  assert.equal(formatBaht(0.2), "฿0.20");
});
