/**
 * Brand logos shown in the homepage "แบรนด์ยอดนิยม" row.
 * SVGs come from https://thesvg.org (CC0-1.0 / Unlicense) and live in /public/brands,
 * with their viewBox cropped to the artwork so `ratio` (width / height) is exact.
 *
 * `wordmark: true` → a wide text logo (drawn shorter); false → a square symbol (drawn taller).
 * `brand` must match `Product.brand` exactly; it is used for the /products?brand= filter.
 */
export type BrandLogo = { brand: string; src: string; ratio: number; wordmark: boolean };

export const brandLogos: BrandLogo[] = [
  { brand: "ASUS", src: "/brands/asus.svg", ratio: 24 / 4.956, wordmark: true },
  { brand: "MSI", src: "/brands/msi.svg", ratio: 19.722 / 24, wordmark: false },
  { brand: "AMD", src: "/brands/amd.svg", ratio: 24 / 5.726, wordmark: true },
  { brand: "Intel", src: "/brands/intel.svg", ratio: 24 / 9.311, wordmark: true },
  { brand: "Corsair", src: "/brands/corsair.svg", ratio: 24 / 23.175, wordmark: false },
  { brand: "NZXT", src: "/brands/nzxt.svg", ratio: 24 / 6.128, wordmark: true },
  { brand: "Samsung", src: "/brands/samsung.svg", ratio: 24 / 3.668, wordmark: true },
  { brand: "Western Digital", src: "/brands/western-digital.svg", ratio: 83 / 22, wordmark: true },
  { brand: "Kingston", src: "/brands/kingston.svg", ratio: 17.359 / 24, wordmark: false },
  { brand: "Razer", src: "/brands/razer.svg", ratio: 23.91 / 24, wordmark: false },
  { brand: "Logitech", src: "/brands/logitech-g.svg", ratio: 106.87 / 26.6, wordmark: true },
  { brand: "SteelSeries", src: "/brands/steelseries.svg", ratio: 1, wordmark: false },
];

/** Logos used only by the catalogue brand picker (not shown in the homepage row). LG from thesvg.org. */
const catalogOnlyLogos: BrandLogo[] = [{ brand: "LG", src: "/brands/lg.svg", ratio: 24 / 10.582, wordmark: true }];

/** Logo lookup by `Product.brand`; brands without an SVG fall back to a text wordmark. */
export const brandLogoMap: Record<string, BrandLogo> = Object.fromEntries(
  [...brandLogos, ...catalogOnlyLogos].map((b) => [b.brand, b]),
);
