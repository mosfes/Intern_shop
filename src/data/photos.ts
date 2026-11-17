import type { CategorySlug } from "@/lib/types";
import sources from "./product-photo-sources.json";

// Downloaded packshots mapped to individual models; provenance is kept in the manifest.
const photosBySlug = new Map(sources.map((source) => [source.slug, source.images]));

export function productPhotos(slug: string): string[] {
  const images = photosBySlug.get(slug);
  if (!images?.length) throw new Error(`Missing product photography: ${slug}`);
  return images;
}

export const categoryPhoto: Record<CategorySlug, string> = {
  "cpu": productPhotos("amd-ryzen-7-9800x3d")[0],
  "gpu": productPhotos("asus-tuf-geforce-rtx-5070")[0],
  "ram": productPhotos("kingston-fury-beast-ddr5-32gb-6000")[0],
  "ssd": productPhotos("samsung-990-pro-2tb")[0],
  "motherboard": productPhotos("asus-rog-strix-x870e-e-gaming-wifi")[0],
  "psu": productPhotos("corsair-rm850x-850w-gold")[0],
  "cooling": productPhotos("nzxt-kraken-elite-360-rgb")[0],
  "case": productPhotos("lian-li-o11-dynamic-evo")[0],
  "monitor": productPhotos("lg-ultragear-27-oled-240hz")[0],
  "gaming-gear": productPhotos("logitech-g-pro-x-superlight-2")[0],
};

export const scenePhotos = {
  heroGpu: "/images/promotions/gpu-transparent.webp",
  heroCpu: "/images/promotions/cpu-transparent.webp",
  heroMonitor: "/images/promotions/monitor-transparent.webp",
  setup: productPhotos("lian-li-o11-dynamic-evo")[0],
  rig: productPhotos("lian-li-o11-dynamic-evo")[0],
  ssd: "/images/promotions/ssd-transparent.webp",
  mouse: "/images/promotions/mouse-transparent.webp",
  motherboard: "/images/promotions/motherboard-transparent.webp",
  cooling: "/images/promotions/cooling-transparent.webp",
};
