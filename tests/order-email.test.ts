import "dotenv/config";
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { renderOrderEmail } from "../src/lib/order-email";
import { createOrderPdf } from "../src/lib/order-pdf";
import { productImageBuffer } from "../src/lib/order-images";
import type { Order } from "../src/lib/types";

const order: Order = { id: "CB123", createdAt: "2026-01-01T00:00:00Z", status: "shipped", lines: [{ productId: "1", name: '<script>alert("x")</script>', image: "/images/promotions/gpu-transparent.png", price: 100, quantity: 2 }], subtotal: 200, discount: 10, total: 220, shipping: 30, shippingMethod: "จัดส่ง", paymentMethod: "บัตร", address: "บ้าน <ทดสอบ>", trackingNumber: "TH123", adminNote: "SECRET ADMIN NOTE" };

test("order email includes status and printable order with escaped customer input", () => {
  const result = renderOrderEmail(order, "status");
  assert.match(result.subject, /กำลังจัดส่ง/);
  assert.match(result.html, /TH123/);
  assert.match(result.html, /&lt;script&gt;/);
  assert.doesNotMatch(result.html, /<script>|SECRET ADMIN NOTE/);
  assert.match(result.html, /220\.00 บาท/);
  assert.match(result.html, /cid:edm-logo/);
  assert.match(result.html, /images\/promotions\/gpu-transparent\.png/);
});

test("purchase order is a real PDF with Thai-capable embedded fonts", async () => {
  const pdf = await createOrderPdf(order);
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.ok(pdf.length > 5000);
});

test("both product photos in the example can be embedded", async () => {
  for (const image of ["/images/products/amd-ryzen-7-9800x3d/3.webp", "/images/products/kingston-fury-beast-ddr5-32gb-6000/1.webp"]) {
    assert.ok(await productImageBuffer(image), `Missing product photo: ${image}`);
  }
});
