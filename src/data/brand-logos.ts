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

/**
 * Brand colours used by the catalogue brand picker: `light` on the light theme, `dark` (a lighter tint) on the dark theme.
 * Single-colour SVGs are drawn as a mask in this colour; brands without a bundled SVG use it for their text wordmark.
 */
export const brandColors: Record<string, { light: string; dark: string }> = {
  ASUS: { light: "#00539B", dark: "#4DA3FF" },
  MSI: { light: "#E60012", dark: "#FF3B3B" },
  AMD: { light: "#ED1C24", dark: "#FF4B50" },
  Intel: { light: "#0068B5", dark: "#3FA0F0" },
  Corsair: { light: "#111111", dark: "#FFD100" },
  NZXT: { light: "#111111", dark: "#E5E7EB" },
  Samsung: { light: "#1428A0", dark: "#5B7CFF" },
  Kingston: { light: "#E31837", dark: "#FF4D64" },
  Razer: { light: "#00B800", dark: "#44D62C" },
  Logitech: { light: "#00B8FC", dark: "#00B8FC" },
  SteelSeries: { light: "#FF5200", dark: "#FF6A2B" },
  LG: { light: "#A50034", dark: "#FF4D7E" },
  "G.SKILL": { light: "#E31E24", dark: "#FF4B4B" },
  GIGABYTE: { light: "#0066B3", dark: "#3D9BFF" },
  Sapphire: { light: "#0F4C9C", dark: "#4C8DFF" },
  Seasonic: { light: "#E60012", dark: "#FF4B4B" },
  Noctua: { light: "#8C6A3F", dark: "#C9A26B" },
  "Lian Li": { light: "#D31F26", dark: "#FF5C5C" },
  "Fractal Design": { light: "#222222", dark: "#E5E7EB" },
  Crucial: { light: "#0073CF", dark: "#3BA0FF" },
  ARCTIC: { light: "#0079AD", dark: "#2BC0F5" },
  Lexar: { light: "#D8232A", dark: "#FF4B50" },
};

/** Logos that already carry their own colours: drawn as a normal image instead of a mask. */
export const nativeColorLogos = new Set(["Western Digital"]);
