import assert from "node:assert/strict";
import { test } from "node:test";
import { applyDiscountCode, computeDiscount, DiscountCodeError, validateDiscountInput, type DiscountCode } from "../src/lib/discount-codes";

const base: DiscountCode = { code: "SAVE10", type: "PERCENT", value: 10, minSubtotal: 0, maxDiscount: null, usageLimit: null, usedCount: 0, expiresAt: null, active: true };
const rejects = (fn: () => unknown, status: number) => assert.throws(fn, (error) => error instanceof DiscountCodeError && error.status === status);

test("percent discounts round down and respect the cap", () => {
  assert.equal(computeDiscount(base, 1999), 199);
  assert.equal(computeDiscount({ ...base, maxDiscount: 150 }, 5000), 150);
});

test("fixed discounts never exceed the subtotal", () => {
  assert.equal(computeDiscount({ type: "FIXED", value: 500, maxDiscount: null }, 300), 300);
  assert.equal(computeDiscount({ type: "FIXED", value: 100, maxDiscount: null }, 3000), 100);
});

test("a valid code returns its discount", () => {
  assert.equal(applyDiscountCode(base, 2000), 200);
});

test("unknown, inactive, expired, used-up and under-minimum codes are refused", () => {
  rejects(() => applyDiscountCode(null, 1000), 404);
  rejects(() => applyDiscountCode({ ...base, active: false }, 1000), 404);
  rejects(() => applyDiscountCode({ ...base, expiresAt: "2026-11-16" }, 1000, new Date("2026-11-17T00:00:00+07:00")), 410);
  rejects(() => applyDiscountCode({ ...base, usageLimit: 5, usedCount: 5 }, 1000), 410);
  rejects(() => applyDiscountCode({ ...base, minSubtotal: 3000 }, 2999), 422);
});

test("a code is still valid through the whole of its last day (Thailand time)", () => {
  assert.equal(applyDiscountCode({ ...base, expiresAt: "2026-11-17" }, 1000, new Date("2026-11-17T23:30:00+07:00")), 100);
});

test("admin input is normalised and validated", () => {
  const input = validateDiscountInput({ code: " save10 ", type: "PERCENT", value: "10", minSubtotal: "", maxDiscount: "200", usageLimit: "50", expiresAt: "2026-12-31" });
  assert.deepEqual(input, { code: "SAVE10", type: "PERCENT", value: 10, minSubtotal: 0, maxDiscount: 200, usageLimit: 50, expiresAt: "2026-12-31", active: true });
  assert.equal(validateDiscountInput({ code: "FLAT", type: "FIXED", value: 100, maxDiscount: 5 }).maxDiscount, null);
  for (const bad of [{ code: "ab" }, { code: "BAD CODE" }, { type: "PERCENT", value: 0 }, { type: "PERCENT", value: 101 }, { type: "FIXED", value: 1.5 }, { type: "FIXED", value: 500, minSubtotal: 100 }, { expiresAt: "31/12/2026" }, { usageLimit: 0 }]) {
    assert.throws(() => validateDiscountInput({ code: "GOOD", type: "FIXED", value: 100, ...bad }), DiscountCodeError);
  }
});
