import assert from "node:assert/strict";
import { test } from "node:test";
import { DiscountCodeError, type DiscountCode } from "../src/lib/discount-codes";
import { isPaymentMethod, paymentLabel, PaymentError, priceOrder, toSatang } from "../src/lib/payments";
import { orderIdForCharge } from "../src/lib/pending-payment";
import type { Product } from "../src/lib/types";

const product = (id: string, price: number, stock = 10) => [id, { id, name: `Product ${id}`, price, stock } as Product] as const;
const catalog = new Map([product("a", 1000), product("b", 2500), product("low", 500, 1)]);
const code: DiscountCode = { code: "TEN", type: "PERCENT", value: 10, minSubtotal: 0, maxDiscount: null, usageLimit: null, usedCount: 0, expiresAt: null, active: true };
const refuses = (fn: () => unknown, kind: typeof PaymentError | typeof DiscountCodeError = PaymentError) => assert.throws(fn, (error) => error instanceof kind);

test("the amount comes from the catalogue, with shipping and the discount applied", () => {
  // 2×1000 + 2500 = 4500 → free standard shipping (≥ 3000); 10% off = 450.
  assert.deepEqual(priceOrder([{ productId: "a", quantity: 2 }, { productId: "b", quantity: 1 }], catalog, "standard", code), { subtotal: 4500, discount: 450, shipping: 0, total: 4050 });
  assert.equal(priceOrder([{ productId: "a", quantity: 1 }], catalog, "standard", null).total, 1060);
  assert.equal(priceOrder([{ productId: "a", quantity: 1 }], catalog, "pickup", null).total, 1000);
});

test("bad carts are refused", () => {
  refuses(() => priceOrder([], catalog, "standard", null));
  refuses(() => priceOrder("nope", catalog, "standard", null));
  refuses(() => priceOrder([{ productId: "zzz", quantity: 1 }], catalog, "standard", null));
  refuses(() => priceOrder([{ productId: "a", quantity: 0 }], catalog, "standard", null));
  refuses(() => priceOrder([{ productId: "a", quantity: 1.5 }], catalog, "standard", null));
  refuses(() => priceOrder([{ productId: "a", quantity: 1 }, { productId: "a", quantity: 1 }], catalog, "standard", null));
  refuses(() => priceOrder([{ productId: "low", quantity: 2 }], catalog, "standard", null));
  refuses(() => priceOrder([{ productId: "a", quantity: 1 }], catalog, "express", null));
});

test("an unusable discount code stops the charge", () => {
  refuses(() => priceOrder([{ productId: "a", quantity: 1 }], catalog, "standard", { ...code, active: false }), DiscountCodeError);
});

test("payment methods and amounts", () => {
  for (const method of ["card", "promptpay", "mobile_banking_kbank", "mobile_banking_scb"]) assert.ok(isPaymentMethod(method));
  for (const method of ["cod", "internet_banking_scb", "", null, 5]) assert.ok(!isPaymentMethod(method));
  assert.equal(paymentLabel("mobile_banking_kbank"), "Mobile Banking · K PLUS (กสิกรไทย)");
  assert.equal(toSatang(1059.9), 105990);
  assert.equal(toSatang(0.1 + 0.2), 30);
});

test("the order number is stable for a charge", () => {
  assert.equal(orderIdForCharge("chrg_test_5abc123xyz9"), orderIdForCharge("chrg_test_5abc123xyz9"));
  assert.match(orderIdForCharge("chrg_test_5abc123xyz9"), /^CB[A-Z0-9]{8}$/);
});
