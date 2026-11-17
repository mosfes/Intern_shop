import assert from "node:assert/strict";
import { test } from "node:test";
import { buildProductHighlights, createProductSpecificationDrafts } from "../src/lib/product-highlights";

test("existing selections reopen checked and unrelated saved highlights are preserved", () => {
  const draft = createProductSpecificationDrafts([{ label: "Socket", value: "AM5" }, { label: "Memory", value: "DDR5" }], ["Socket: AM5", "Original marketing text"]);
  assert.equal(draft.specifications[0].highlighted, true);
  assert.equal(draft.specifications[1].highlighted, false);
  assert.deepEqual(buildProductHighlights(draft.specifications, draft.legacyHighlights), ["Socket: AM5", "Original marketing text"]);
  assert.deepEqual(buildProductHighlights(draft.specifications, draft.legacyHighlights.map((row) => ({ ...row, selected: false }))), ["Socket: AM5"]);
});

test("editing or deleting a selected specification updates highlights without selecting another row", () => {
  const draft = createProductSpecificationDrafts([{ label: "Socket", value: "AM5" }, { label: "Memory", value: "DDR5" }], ["Memory: DDR5"]);
  const edited = draft.specifications.map((row) => row.highlighted ? { ...row, value: "DDR4" } : row);
  assert.deepEqual(buildProductHighlights(edited, []), ["Memory: DDR4"]);
  assert.deepEqual(buildProductHighlights(edited.slice(1), []), ["Memory: DDR4"]);
  assert.deepEqual(buildProductHighlights(edited.filter((row) => !row.highlighted), []), []);
});

test("incomplete and duplicate specification highlights do not create invalid display entries", () => {
  const draft = createProductSpecificationDrafts([{ label: " Socket ", value: " AM5 " }, { label: "Socket", value: "AM5" }, { label: "", value: "DDR5" }], []);
  assert.deepEqual(buildProductHighlights(draft.specifications.map((row) => ({ ...row, highlighted: true })), []), ["Socket: AM5"]);
});
