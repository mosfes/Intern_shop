import assert from "node:assert/strict";
import { test } from "node:test";
import { products } from "../src/data/products";
import { checkBuild, powerSupplyAdvice } from "../src/lib/pc-builder";
import { storeActions } from "../src/lib/store";
import type { Product } from "../src/lib/types";

const get = (slug: string) => products.find((p) => p.slug === slug)!;
const amd = get("amd-ryzen-7-9800x3d");
const board = products.find((p) => p.category === "motherboard" && p.specifications.some((s) => s.label === "Socket" && s.value === "AM5"))!;
const intel = get("intel-core-ultra-7-265k");
const gpu = get("asus-tuf-gaming-rtx-5070-oc") ?? products.find((p) => p.category === "gpu")!;
const psu = products.find((p) => p.category === "psu")!;
const change = (p: Product, label: string, value: string): Product => ({ ...p, specifications: [...p.specifications.filter((s) => s.label !== label), { label, value }] });

test("AMD board accepts matching socket and rejects Intel CPU", () => {
  assert.equal(checkBuild({ cpu: amd, motherboard: board })[0].status, "pass");
  assert.equal(checkBuild({ cpu: intel, motherboard: board })[0].status, "error");
});

test("missing specifications remain unknown", () => {
  assert.equal(checkBuild({ cpu: amd, motherboard: { ...board, specifications: [] } })[0].status, "unknown");
});

test("DDR generation mismatch is rejected", () => {
  const ram = products.find((p) => p.category === "ram")!;
  assert.equal(checkBuild({ ram, motherboard: board })[0].status, "pass");
  assert.equal(checkBuild({ ram: change(ram, "Type", "DDR4"), motherboard: board })[0].status, "error");
});

test("PSU wattage is advisory and never rejects or certifies compatibility", () => {
  for (const watts of ["400W", "1200W", ""]) {
    const parts = { gpu, psu: change(psu, "Wattage", watts) };
    assert.deepEqual(checkBuild(parts), []);
    assert.ok(powerSupplyAdvice(parts));
  }
  const recommendedGpu = change(gpu, "Recommended PSU", "750 W");
  assert.match(powerSupplyAdvice({ gpu: recommendedGpu, psu: change(psu, "Wattage", "400W") })!, /ต่ำกว่าคำแนะนำ/);
  assert.match(powerSupplyAdvice({ gpu: recommendedGpu, psu: change(psu, "Wattage", "1200W") })!, /อุปกรณ์ทั้งชุดเพิ่มเติม/);
  assert.match(powerSupplyAdvice({ gpu: recommendedGpu, psu: change(psu, "Wattage", "") })!, /ข้อมูลกำลังไฟไม่เพียงพอ/);
  assert.equal(powerSupplyAdvice({ gpu }), null);
  assert.equal(powerSupplyAdvice({ psu }), null);
});

test("oversize GPU is rejected and missing cooler clearance remains unknown", () => {
  const pcCase = products.find((p) => p.category === "case")!;
  const cooling = products.find((p) => p.category === "cooling")!;
  assert.equal(checkBuild({ gpu: change(gpu, "Dimensions", "500 x 140 x 63 mm"), case: pcCase })[0].status, "error");
  assert.equal(checkBuild({ case: pcCase, cooling })[0].status, "unknown");
});

test("an ATX-only case does not accept an E-ATX board", () => {
  const pcCase = products.find((p) => p.category === "case")!;
  assert.equal(checkBuild({ motherboard: change(board, "Form Factor", "E-ATX"), case: change(pcCase, "Motherboard Support", "ATX, Micro-ATX") })[0].status, "error");
});

test("batch cart insertion is atomic when an existing quantity reaches stock", () => {
  storeActions.clearCart();
  assert.equal(storeActions.addBuildToCart([{ ...amd, stock: 1 }, board]), true);
  assert.equal(storeActions.addBuildToCart([{ ...amd, stock: 1 }, board]), false);
  assert.equal(storeActions.addBuildToCart([{ ...board, stock: 2 }]), true);
  assert.equal(storeActions.addBuildToCart([{ ...board, stock: 2 }]), false);
  assert.equal(storeActions.addBuildToCart([]), false);
  storeActions.clearCart();
});
