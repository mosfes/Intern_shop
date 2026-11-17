import type { CategorySlug, Product } from "./types";

/**
 * Category-specific sub-filters (socket, DDR, wattage, 80 PLUS …).
 * Catalogue data is typed in by hand, so each facet reads a few spec labels (and the product
 * name as a fallback) and normalises them into a small set of comparable values.
 */
export interface SpecFacet {
  /** Unique across categories, e.g. "cpu.socket". */
  key: string;
  category: CategorySlug;
  title: string;
  /** Normalised values for a product; [] when unknown. Several values = the product matches any of them. */
  values: (p: Product) => string[];
  /** Custom option order (best first); default is natural sort. */
  order?: string[];
}

/** Selected values per facet key. */
export type SpecSelection = Record<string, string[]>;

function specs(p: Product, ...labels: string[]) {
  const wanted = labels.map((l) => l.toLowerCase());
  return p.specifications
    .filter((s) => wanted.includes(s.label.trim().toLowerCase()))
    .map((s) => s.value.trim())
    .filter((v) => v && !/^-+(\s|$)/.test(v));
}

/** Spec values for these labels, then the product name. */
const text = (p: Product, ...labels: string[]) => [...specs(p, ...labels), p.name].join(" | ");
const first = <T,>(v: T | undefined | null) => (v === undefined || v === null ? [] : [v]);

function socketOf(value: string) {
  const s = value.toUpperCase();
  const amd = s.match(/\bAM[345]\b/)?.[0];
  if (amd) return amd;
  const lga = s.match(/LGA\s?(\d{4})|SOCKET\s+(\d{4})|^(\d{4})\b/);
  const n = lga?.[1] ?? lga?.[2] ?? lga?.[3];
  return n ? `LGA${n}` : undefined;
}

const ddrOf = (value: string) => value.toUpperCase().match(/\bDDR[345]\b/)?.[0];

function capacityOf(value: string) {
  const m = value.toUpperCase().match(/(\d+(?:\.\d+)?)\s?(TB|GB)\b/);
  if (!m) return undefined;
  const n = Number(m[1]);
  return m[2] === "TB" ? `${n}TB` : n >= 1000 ? `${n / 1000}TB` : `${n}GB`;
}

function pcieOf(value: string) {
  const m = value.toUpperCase().match(/PCIE\s?([345])(?:\.0)?/);
  return m ? `PCIe ${m[1]}.0` : undefined;
}

function wattsOf(value: string) {
  const m = value.match(/(\d{3,4})\s?W\b/i);
  return m ? `${m[1]}W` : undefined;
}

const RATINGS = ["Titanium", "Platinum", "Gold", "Silver", "Bronze"];
function ratingOf(p: Product) {
  const s = text(p, "Efficiency", "มาตราฐานรับรอง", "มาตรฐานรับรอง", "80 Plus");
  if (!/80\s?PLUS|80\+/i.test(s)) return "ไม่มี 80 PLUS";
  const r = RATINGS.find((x) => new RegExp(`80\\s?(?:PLUS|\\+)\\s*${x}`, "i").test(s));
  return r ? `80 PLUS ${r}` : "80 PLUS (White)";
}

function formFactorOf(value: string): string | undefined {
  const s = value.toUpperCase();
  if (/E-?ATX/.test(s)) return "E-ATX";
  if (/MICRO-?ATX|M-?ATX|\bMATX/.test(s)) return "Micro-ATX";
  if (/MINI-?ITX|\bITX/.test(s)) return "Mini-ITX";
  if (/\bATX\b/.test(s)) return "ATX";
  return undefined;
}

function resolutionOf(value: string) {
  const m = value.match(/(\d{4})\s?[x×]\s?(\d{3,4})/);
  if (!m) return undefined;
  const w = Number(m[1]);
  if (w >= 5000) return "5K+";
  if (w >= 3840) return "4K (3840×2160)";
  if (w >= 3440) return "UWQHD (3440×1440)";
  if (w >= 2560) return "2K (2560×1440)";
  return "Full HD (1920×1080)";
}

export const specFacets: SpecFacet[] = [
  // CPU
  { key: "cpu.socket", category: "cpu", title: "ซ็อกเก็ต", values: (p) => first(socketOf(text(p, "Socket"))) },
  {
    key: "cpu.cores",
    category: "cpu",
    title: "จำนวนคอร์",
    values: (p) => {
      const s = text(p, "Cores / Threads", "CPU Core / Thread");
      const m = s.match(/Total Cores\s*:\s*(\d+)|# of CPU Cores\s*:\s*(\d+)|(\d+)\s*(?:\/|Cores|C\b)/i);
      const n = m?.[1] ?? m?.[2] ?? m?.[3];
      return n ? [`${n} คอร์`] : [];
    },
  },
  {
    key: "cpu.igpu",
    category: "cpu",
    title: "กราฟิกในตัว",
    values: (p) => {
      const s = specs(p, "Integrated Graphics")[0];
      if (s) return [/^no\b/i.test(s) ? "ไม่มี (ต้องใช้การ์ดจอ)" : "มีกราฟิกในตัว"];
      // Intel "F" / AMD non-G parts have no iGPU — only infer for the obvious Intel case.
      return /\bI[3579]-\d{4,5}F\b/i.test(p.name) ? ["ไม่มี (ต้องใช้การ์ดจอ)"] : [];
    },
    order: ["มีกราฟิกในตัว", "ไม่มี (ต้องใช้การ์ดจอ)"],
  },

  // Motherboard
  { key: "motherboard.socket", category: "motherboard", title: "ซ็อกเก็ต", values: (p) => first(socketOf(text(p, "Socket"))) },
  {
    key: "motherboard.chipset",
    category: "motherboard",
    title: "ชิปเซ็ต",
    values: (p) => first(text(p, "Chipset").toUpperCase().match(/\b[ABHXZ]\d{3}E?\b/)?.[0]),
  },
  { key: "motherboard.ddr", category: "motherboard", title: "ชนิดแรม", values: (p) => first(ddrOf(text(p, "Memory", "Memory Type"))) },
  {
    key: "motherboard.form",
    category: "motherboard",
    title: "ขนาดบอร์ด",
    values: (p) => first(formFactorOf(text(p, "Form Factor"))),
    order: ["E-ATX", "ATX", "Micro-ATX", "Mini-ITX"],
  },

  // RAM
  { key: "ram.ddr", category: "ram", title: "ชนิดแรม (DDR)", values: (p) => first(ddrOf(text(p, "Type"))) },
  {
    key: "ram.capacity",
    category: "ram",
    title: "ความจุรวม",
    values: (p) => first(capacityOf(text(p, "Capacity", "Total Capacity"))),
  },
  {
    key: "ram.speed",
    category: "ram",
    title: "ความเร็ว",
    values: (p) => {
      const m = text(p, "Speed").match(/(\d{4})\s?(?:\(OC\)\s?)?(?:MT\/S|MHZ|MBPS)/i);
      return m ? [`${m[1]} MHz`] : [];
    },
  },
  {
    key: "ram.kit",
    category: "ram",
    title: "จำนวนแถว",
    values: (p) => {
      const m = text(p, "Capacity", "Number of DIMMs").match(/(\d)\s?x\s?\d+\s?GB|\d+\s?GB\s?x\s?(\d)|(\d)\s?DIMM/i);
      const n = m?.[1] ?? m?.[2] ?? m?.[3];
      return n ? [n === "1" ? "1 แถว (Single)" : `${n} แถว (Kit)`] : [];
    },
  },

  // GPU
  {
    key: "gpu.chip",
    category: "gpu",
    title: "ชิปการ์ดจอ",
    values: (p) => {
      const s = text(p, "GPU").toUpperCase();
      const m = s.match(/RTX\s?\d{4}(?:\s?TI)?(?:\s?SUPER)?|RX\s?\d{4}(?:\s?XTX?|\s?GRE)?|ARC\s?[AB]\d{3}/);
      return m ? [m[0].replace(/\s+/g, " ").replace(/^(RTX|RX|ARC)(\S)/, "$1 $2").replace(/TI$/, "Ti").replace(/SUPER$/, "Super")] : [];
    },
  },
  {
    key: "gpu.vram",
    category: "gpu",
    title: "หน่วยความจำ",
    values: (p) => first(text(p, "Memory").toUpperCase().match(/(\d+)\s?GB/)?.[1]).map((n) => `${n}GB`),
  },

  // SSD
  { key: "ssd.capacity", category: "ssd", title: "ความจุ", values: (p) => first(capacityOf(text(p, "Capacity", "ความจุ"))) },
  { key: "ssd.pcie", category: "ssd", title: "อินเทอร์เฟซ", values: (p) => first(pcieOf(text(p, "Interface"))), order: ["PCIe 5.0", "PCIe 4.0", "PCIe 3.0"] },
  {
    key: "ssd.form",
    category: "ssd",
    title: "ฟอร์มแฟกเตอร์",
    values: (p) => {
      const s = text(p, "Form Factor").toUpperCase();
      if (/M\.2\s?22(30|42|80)/.test(s)) return [`M.2 22${s.match(/M\.2\s?22(30|42|80)/)![1]}`];
      if (/M\.2/.test(s)) return ["M.2"];
      if (/2\.5/.test(s)) return ['2.5"'];
      return [];
    },
  },

  // PSU
  {
    key: "psu.watts",
    category: "psu",
    title: "กำลังไฟ",
    values: (p) => first(wattsOf(text(p, "Wattage", "กำลังไฟสูงสุด", "กำลังไฟ"))),
  },
  { key: "psu.rating", category: "psu", title: "มาตรฐาน 80 PLUS", values: (p) => [ratingOf(p)], order: [...RATINGS.map((r) => `80 PLUS ${r}`), "80 PLUS (White)", "ไม่มี 80 PLUS"] },
  {
    key: "psu.modular",
    category: "psu",
    title: "การถอดสาย",
    values: (p) => {
      const s = specs(p, "Modular", "สามารถถอดสายได้").join(" ");
      if (/non/i.test(s)) return ["Non-Modular"];
      if (/semi/i.test(s)) return ["Semi-Modular"];
      if (/full|modular/i.test(s)) return ["Full Modular"];
      return [];
    },
    order: ["Full Modular", "Semi-Modular", "Non-Modular"],
  },
  {
    key: "psu.atx3",
    category: "psu",
    title: "มาตรฐาน ATX",
    values: (p) => first(text(p, "Standard").toUpperCase().match(/ATX\s?3\.\d/)?.[0].replace(/ATX\s?/, "ATX ")),
  },

  // Cooling
  {
    key: "cooling.type",
    category: "cooling",
    title: "ประเภท",
    values: (p) => {
      if (specs(p, "Radiator").length || /liquid|aio|kraken|water/i.test(p.name)) return ["ชุดน้ำ AIO"];
      if (/air|tower|heatsink/i.test(text(p, "Type"))) return ["ฮีตซิงก์ลม"];
      return [];
    },
  },
  {
    key: "cooling.radiator",
    category: "cooling",
    title: "ขนาดหม้อน้ำ",
    values: (p) => first(text(p, "Radiator").match(/\b(120|140|240|280|360|420)\s?mm\b/i)?.[1]).map((n) => `${n} mm`),
  },
  {
    key: "cooling.socket",
    category: "cooling",
    title: "รองรับซ็อกเก็ต",
    values: (p) =>
      specs(p, "Socket Support", "Socket")
        .join(",")
        .split(/[,/|]/)
        .map((s) => socketOf(s.trim()))
        .filter((s): s is string => !!s),
  },

  // Case
  { key: "case.form", category: "case", title: "ขนาดเคส", values: (p) => specs(p, "Form Factor").slice(0, 1) },
  {
    key: "case.mobo",
    category: "case",
    title: "รองรับเมนบอร์ด",
    values: (p) =>
      specs(p, "Motherboard Support")
        .join(",")
        .split(",")
        .map((s) => formFactorOf(s))
        .filter((s): s is string => !!s),
    order: ["E-ATX", "ATX", "Micro-ATX", "Mini-ITX"],
  },

  // Monitor
  {
    key: "monitor.size",
    category: "monitor",
    title: "ขนาดจอ",
    values: (p) => first(text(p, "Size").match(/(\d{2}(?:\.\d)?)\s?(?:นิ้ว|"|inch|in\b)/i)?.[1]).map((n) => `${n} นิ้ว`),
  },
  { key: "monitor.resolution", category: "monitor", title: "ความละเอียด", values: (p) => first(resolutionOf(text(p, "Resolution"))) },
  {
    key: "monitor.refresh",
    category: "monitor",
    title: "รีเฟรชเรต",
    values: (p) => first(text(p, "Refresh Rate").match(/(\d{2,3})\s?Hz/i)?.[1]).map((n) => `${n}Hz`),
  },
  { key: "monitor.panel", category: "monitor", title: "ชนิดพาเนล", values: (p) => first(text(p, "Panel").toUpperCase().match(/QD-OLED|OLED|IPS|VA|TN/)?.[0]) },

  // Gaming gear
  {
    key: "gaming-gear.type",
    category: "gaming-gear",
    title: "ประเภท",
    values: (p) => {
      const s = text(p, "Type");
      if (/keyboard|คีย์บอร์ด/i.test(s)) return ["คีย์บอร์ด"];
      if (/headset|หูฟัง/i.test(s)) return ["หูฟัง"];
      if (/mouse|เมาส์|\bDPI\b/i.test(s) || specs(p, "DPI", "Sensor", "เซนเซอร์").length) return ["เมาส์"];
      return [];
    },
  },
  {
    key: "gaming-gear.connection",
    category: "gaming-gear",
    title: "การเชื่อมต่อ",
    values: (p) => [/wireless|lightspeed|2\.4\s?GHz|bluetooth|ไร้สาย/i.test(text(p, "Connectivity", "การเชื่อมต่อ", "Type")) ? "ไร้สาย" : "มีสาย"],
  },
];

export const facetMap = new Map(specFacets.map((f) => [f.key, f]));

const cache = new WeakMap<Product, Map<string, string[]>>();
export function facetValues(p: Product, facet: SpecFacet) {
  let m = cache.get(p);
  if (!m) cache.set(p, (m = new Map()));
  let v = m.get(facet.key);
  if (!v) m.set(facet.key, (v = [...new Set(facet.values(p))]));
  return v;
}

/** A product passes when every active facet of its own category matches; other categories' facets don't apply. */
export function matchesSpecs(p: Product, selection: SpecSelection) {
  for (const [key, selected] of Object.entries(selection)) {
    if (selected.length === 0) continue;
    const facet = facetMap.get(key);
    if (!facet || facet.category !== p.category) continue;
    if (!facetValues(p, facet).some((v) => selected.includes(v))) return false;
  }
  return true;
}

const natural = new Intl.Collator("en", { numeric: true });
function sortOptions(facet: SpecFacet, values: string[]) {
  const unit = (v: string) => (/TB$/.test(v) ? 1000 : 1);
  return [...values].sort((a, b) => {
    if (facet.order) {
      const ia = facet.order.indexOf(a), ib = facet.order.indexOf(b);
      if (ia !== ib) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    }
    const na = parseFloat(a) * unit(a), nb = parseFloat(b) * unit(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
    return natural.compare(a, b);
  });
}

export interface FacetOption {
  value: string;
  count: number;
}

/**
 * Facets (with options) for the given category. `scoped` is the product list after every other filter
 * except this facet, so counts reflect what selecting the option would show.
 */
export function facetOptions(facet: SpecFacet, all: Product[], scoped: Product[]): FacetOption[] {
  const inCategory = all.filter((p) => p.category === facet.category);
  const values = new Set(inCategory.flatMap((p) => facetValues(p, facet)));
  const counts: Record<string, number> = {};
  for (const p of scoped) {
    if (p.category !== facet.category) continue;
    for (const v of facetValues(p, facet)) counts[v] = (counts[v] ?? 0) + 1;
  }
  return sortOptions(facet, [...values]).map((value) => ({ value, count: counts[value] ?? 0 }));
}

export const facetsForCategory = (category: CategorySlug) => specFacets.filter((f) => f.category === category);

/** Drops selections whose facet doesn't belong to one of the given categories. */
export function pruneSpecs(selection: SpecSelection, categories: CategorySlug[]): SpecSelection {
  return Object.fromEntries(
    Object.entries(selection).filter(([key, v]) => v.length > 0 && categories.includes(facetMap.get(key)?.category ?? "")),
  );
}
