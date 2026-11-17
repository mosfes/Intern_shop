import type { Specification } from "./types";

export type SpecificationDraft = Specification & { id: string; highlighted: boolean };
export type LegacyHighlight = { text: string; selected: boolean };
export const MAX_PRODUCT_HIGHLIGHTS = 30;

export function specificationHighlight(spec: Specification) {
  return spec.label.trim() && spec.value.trim() ? `${spec.label.trim()}: ${spec.value.trim()}` : "";
}

export function createProductSpecificationDrafts(specifications: Specification[], highlights: string[]) {
  const matched = new Set<string>();
  const rows = specifications.map((spec, index) => {
    const text = specificationHighlight(spec);
    const highlighted = !!text && highlights.includes(text);
    if (highlighted) matched.add(text);
    return { ...spec, id: `spec-${index}`, highlighted };
  });
  return {
    specifications: rows,
    // Keep existing marketing highlights until the administrator explicitly deselects them.
    legacyHighlights: highlights.filter((text) => !matched.has(text)).map((text) => ({ text, selected: true })),
  };
}

export function buildProductHighlights(specifications: SpecificationDraft[], legacyHighlights: LegacyHighlight[]) {
  return [...new Set([
    ...specifications.filter((spec) => spec.highlighted).map(specificationHighlight).filter(Boolean),
    ...legacyHighlights.filter((highlight) => highlight.selected).map((highlight) => highlight.text),
  ])];
}
