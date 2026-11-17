import "dotenv/config";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { after, mock, test } from "node:test";
import { verifyOmiseSignature, webhookChargeId } from "../src/lib/omise-webhook";
import { settleCharge } from "../src/lib/payment-settlement";
import { prisma } from "../src/lib/prisma";
import type { OmiseCharge } from "../src/lib/omise";
import { POST } from "../src/app/api/payments/webhook/route";

const originalTransaction = prisma.$transaction;
const restore = () => { prisma.$transaction = originalTransaction; mock.restoreAll(); };
after(() => prisma.$disconnect());

test("webhook signatures validate raw bytes and support secret rotation", () => {
  const secret = Buffer.from("test-webhook-secret").toString("base64");
  const raw = '{"object":"event"}';
  const time = "1794900000";
  const signature = createHmac("sha256", Buffer.from(secret, "base64")).update(`${time}.${raw}`).digest("hex");
  assert.ok(verifyOmiseSignature(raw, signature, time, secret));
  assert.ok(verifyOmiseSignature(raw, `${"a".repeat(64)}, ${signature}`, time, secret));
  assert.ok(!verifyOmiseSignature(raw + " ", signature, time, secret));
  assert.ok(!verifyOmiseSignature(raw, "short", time, secret));
  assert.ok(!verifyOmiseSignature(raw, signature, null, secret));
});

test("only supported charge events yield a safe charge ID", () => {
  const event = { object: "event", key: "charge.complete", data: { object: "charge", id: "chrg_test_123" } };
  assert.equal(webhookChargeId(event), "chrg_test_123");
  assert.equal(webhookChargeId({ ...event, key: "refund.create" }), null);
  assert.equal(webhookChargeId({ ...event, data: { object: "charge", id: "../charges" } }), null);
  assert.equal(webhookChargeId(null), null);
});

const charge: OmiseCharge = {
  id: "chrg_test_123", status: "successful", paid: true, amount: 10000, currency: "thb",
  authorize_uri: null, failure_code: null, failure_message: null, expires_at: null,
  metadata: { userId: "customer-1", checkoutId: "checkout-1" },
};

function fakeDatabase() {
  const row = {
    id: "checkout-1", chargeId: null as string | null, userId: "customer-1", amount: 10000, status: "pending",
    order: { id: "checkout-1", discountCode: "TEN", lines: [{ productId: "product-1" }], total: 100 },
  };
  const writes = { ledger: 0, coupons: 0, carts: 0 };
  const tx = {
    $queryRaw: async () => [],
    $executeRaw: async () => 1,
    stockLock: { createMany: async () => ({ count: 1 }) },
    stockMovement: { findFirst: async () => null },
    stockReservation: { findMany: async () => [], updateMany: async () => ({ count: 0 }) },
    checkoutPayment: {
      findFirst: async () => row,
      updateMany: async ({ where, data }: { where: { status: string | { not: string } }; data: { status: string; chargeId: string } }) => {
        const matches = typeof where.status === "string" ? row.status === where.status : row.status !== where.status.not;
        if (!matches) return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      },
    },
    paymentCharge: { createMany: async () => ({ count: ++writes.ledger === 1 ? 1 : 0 }) },
    discountCode: { updateMany: async () => { writes.coupons++; } },
    cartItem: { deleteMany: async () => { writes.carts++; } },
  };
  prisma.$transaction = (async (callback: unknown) => (callback as (client: unknown) => unknown)(tx)) as typeof prisma.$transaction;
  return { row, writes, tx };
}

test("closed-browser settlement saves the order once and ignores late pending/failure events", async () => {
  const { row, writes } = fakeDatabase();
  try {
    const order = await settleCharge(charge);
    assert.equal(order?.id, "CBGTEST123");
    assert.equal(row.status, "successful");
    await settleCharge(charge);
    await settleCharge({ ...charge, status: "pending", paid: false });
    await settleCharge({ ...charge, status: "failed", paid: false });
    assert.equal(row.status, "successful");
    assert.deepEqual(writes, { ledger: 1, coupons: 1, carts: 1 });
  } finally { restore(); }
});

test("failed, expired and unpaid charges cannot create a paid order", async () => {
  for (const status of ["failed", "expired", "pending", "successful"]) {
    const { row, writes } = fakeDatabase();
    try {
      assert.equal(await settleCharge({ ...charge, status, paid: false }), null);
      assert.notEqual(row.status, "successful");
      assert.deepEqual(writes, { ledger: 0, coupons: 0, carts: 0 });
    } finally { restore(); }
  }
});

test("owner, amount, currency and linked charge mismatches cannot settle", async () => {
  for (const patch of [{ amount: 1 }, { currency: "usd" }, { metadata: { userId: "other" } }]) {
    fakeDatabase();
    try { await assert.rejects(settleCharge({ ...charge, ...patch }), /does not match/); }
    finally { restore(); }
  }
  const { row } = fakeDatabase();
  row.chargeId = "chrg_test_other";
  try { await assert.rejects(settleCharge(charge), /does not match/); }
  finally { restore(); }
});

test("webhook ignores forged paid status and verifies the charge through Omise", async () => {
  const { row, writes } = fakeDatabase();
  const previousKey = process.env.OMISE_SECRET_KEY;
  const previousSecret = process.env.OMISE_WEBHOOK_SECRET;
  process.env.OMISE_SECRET_KEY = "skey_test_unit_test";
  delete process.env.OMISE_WEBHOOK_SECRET;
  let fetched = "";
  mock.method(globalThis, "fetch", async (url: string) => {
    fetched = url;
    return Response.json({ ...charge, status: "pending", paid: false });
  });
  try {
    const response = await POST(new Request("https://shop.test/api/payments/webhook", { method: "POST", body: JSON.stringify({ object: "event", key: "charge.complete", data: { object: "charge", ...charge } }) }));
    assert.equal(response.status, 200);
    assert.equal(fetched, "https://api.omise.co/charges/chrg_test_123");
    assert.equal(row.status, "pending");
    assert.equal(writes.ledger, 0);
    process.env.OMISE_WEBHOOK_SECRET = Buffer.from("secret").toString("base64");
    assert.equal((await POST(new Request("https://shop.test/api/payments/webhook", { method: "POST", body: "{}" }))).status, 401);
  } finally {
    if (previousKey === undefined) delete process.env.OMISE_SECRET_KEY; else process.env.OMISE_SECRET_KEY = previousKey;
    if (previousSecret === undefined) delete process.env.OMISE_WEBHOOK_SECRET; else process.env.OMISE_WEBHOOK_SECRET = previousSecret;
    restore();
  }
});
