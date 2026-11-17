import assert from "node:assert/strict";
import { test } from "node:test";
import { AddressError, formatAddressLine, sortAddresses, validateAddress } from "../src/lib/addresses";

const valid = {
  label: " บ้าน ",
  fullName: " สมชาย ใจดี ",
  phone: "081-234-5678",
  address: " 99/1 ถนนสุขุมวิท ",
  province: "กรุงเทพมหานคร",
  district: "บางรัก",
  postcode: "10500",
};

test("a valid address is trimmed and kept", () => {
  assert.deepEqual(validateAddress(valid), { ...valid, label: "บ้าน", fullName: "สมชาย ใจดี", address: "99/1 ถนนสุขุมวิท" });
  assert.equal(validateAddress({ ...valid, label: undefined }).label, "");
});

test("bad addresses name the failing field", () => {
  const field = (patch: Record<string, unknown>) => {
    try { validateAddress({ ...valid, ...patch }); } catch (e) { return e instanceof AddressError ? e.message : "other"; }
    return "none";
  };
  assert.equal(field({ fullName: "  " }), "fullName");
  assert.equal(field({ address: "" }), "address");
  assert.equal(field({ address: "x".repeat(501) }), "address");
  assert.equal(field({ phone: "abc" }), "phone");
  assert.equal(field({ district: "ไม่มีอำเภอนี้" }), "district");
  assert.equal(field({ postcode: "99999" }), "postcode");
  assert.equal(field({ province: "ไม่มีจังหวัดนี้" }), "district");
  assert.equal(field({ label: 5 }), "label");
  assert.throws(() => validateAddress(null), AddressError);
});

test("addresses print on one line and the default sorts first", () => {
  assert.equal(formatAddressLine(validate()), "99/1 ถนนสุขุมวิท บางรัก กรุงเทพมหานคร 10500");
  assert.deepEqual(sortAddresses([{ id: "a", isDefault: false }, { id: "b", isDefault: true }]).map((a) => a.id), ["b", "a"]);
});

function validate() { return validateAddress(valid); }
