import assert from "node:assert/strict";
import { test } from "node:test";
import { CatalogMetadataError, toSpecFields, validateCatalogMetadata } from "../src/lib/catalog-metadata";

test("category default specs are validated, trimmed and keep their order", () => {
  const base = { kind: "category", slug: "cpu", nameTh: "ซีพียู", name: "CPU" };
  const saved = validateCatalogMetadata("category", { ...base, specFields: [{ label: " Socket ", example: " AM5 ", hint: " ซ็อกเก็ต ", compatibility: true }, { label: "TDP", example: "" }] });
  assert.ok("specFields" in saved);
  assert.deepEqual(saved.specFields, [{ label: "Socket", example: "AM5", hint: "ซ็อกเก็ต", compatibility: true }, { label: "TDP", example: "" }]);
  assert.equal((validateCatalogMetadata("category", base) as { specFields?: unknown }).specFields, undefined);
  assert.deepEqual((validateCatalogMetadata("category", { ...base, specFields: [] }) as { specFields?: unknown }).specFields, []);
  for (const bad of [[{ label: "" }], [{ label: "A" }, { label: " a " }], [{ label: "x".repeat(121) }], [{ label: "A", hint: "h".repeat(501) }], "nope", Array.from({ length: 41 }, (_, i) => ({ label: `L${i}` }))])
    assert.throws(() => validateCatalogMetadata("category", { ...base, specFields: bad }), CatalogMetadataError);
});

test("stored spec rows come back ordered, with flags only when set", () => {
  assert.deepEqual(toSpecFields([
    { label: "B", example: "", hint: "", compatibility: false, powerAdvice: true, position: 1 },
    { label: "A", example: "x", hint: "ยาว x กว้าง", compatibility: true, powerAdvice: false, position: 0 },
  ]), [{ label: "A", example: "x", hint: "ยาว x กว้าง", compatibility: true }, { label: "B", example: "", powerAdvice: true }]);
  assert.deepEqual(toSpecFields(undefined), []);
});
