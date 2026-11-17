import assert from "node:assert/strict";
import { test } from "node:test";
import { products } from "../src/data/products";
import { checkBuild, type BuildParts } from "../src/lib/pc-builder";
import { addSpecificationDefaults, builtInSpecFields } from "../src/lib/product-specification-templates";

test("restoring defaults preserves edited fields, selections and custom specifications", () => {
  const existing = [
    { id: "saved", label: " Socket ", value: "AM5", highlighted: true },
    { id: "custom", label: "Custom", value: "Original value", highlighted: false },
  ];
  const restored = addSpecificationDefaults(builtInSpecFields("cpu"), existing);
  assert.deepEqual(restored.slice(0, 2), existing);
  assert.equal(restored.filter((row) => row.label.trim().toLowerCase() === "socket").length, 1);
  assert.deepEqual(addSpecificationDefaults(builtInSpecFields("cpu"), restored), restored);
  assert.deepEqual(addSpecificationDefaults(builtInSpecFields("custom-category"), existing), existing);
  assert.deepEqual(builtInSpecFields("constructor"), []);
});

test("products filled using default field names support all existing build checks", () => {
  const values: Record<string, Record<string, string>> = {
    cpu: { Socket: "AM5" },
    motherboard: { Socket: "AM5", Memory: "DDR5", "Form Factor": "ATX" },
    ram: { Type: "DDR5" },
    gpu: { "Recommended PSU": "750 W", Dimensions: "300 x 120 x 50 mm" },
    psu: { Wattage: "850 W" },
    cooling: { "Socket Support": "AM5, AM4, LGA1700", Height: "160 mm" },
    case: { "Motherboard Support": "ATX, Micro-ATX, Mini-ITX", "GPU Clearance": "400 mm", "CPU Cooler Clearance": "170 mm", "Radiator Support": "360 mm" },
  };
  const parts: BuildParts = Object.fromEntries(Object.entries(values).map(([category, fields]) => [category, {
    ...products.find((product) => product.category === category)!,
    specifications: addSpecificationDefaults(builtInSpecFields(category), []).filter((row) => fields[row.label]).map((row) => ({ label: row.label, value: fields[row.label] })),
  }]));
  const checks = checkBuild(parts);
  assert.equal(checks.length, 6);
  assert.ok(checks.every((check) => check.status === "pass"), JSON.stringify(checks));
  parts.cooling = { ...parts.cooling!, specifications: [{ label: "Socket Support", value: "AM5" }, { label: "Radiator", value: "360 mm" }] };
  assert.ok(checkBuild(parts).every((check) => check.status === "pass"));
  parts.gpu = { ...parts.gpu!, specifications: [{ label: "Recommended PSU", value: "1000 W" }, { label: "Dimensions", value: "500 mm" }] };
  assert.equal(checkBuild(parts).filter((check) => check.status === "error").length, 1);
});

test("restoring a full product respects the specification row limit", () => {
  const rows = Array.from({ length: 79 }, (_, index) => ({ id: `${index}`, label: `Custom ${index}`, value: "value", highlighted: false }));
  assert.equal(addSpecificationDefaults(builtInSpecFields("cpu"), rows).length, 80);
});
