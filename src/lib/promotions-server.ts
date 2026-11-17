import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "./prisma";
import { DEFAULT_PROMOTIONS, groupPromotions, type HomepagePromotions, type Promotion } from "./promotions";

/** Cache tag for homepage promotions — revalidated after every admin edit. */
export const PROMOTIONS_TAG = "promotions";

export const toPromotion = (row: Omit<Promotion, "placement" | "theme"> & { placement: string; theme: string }): Promotion => ({
  id: row.id, placement: row.placement as Promotion["placement"], position: row.position, active: row.active,
  tag: row.tag, eyebrow: row.eyebrow, title: row.title, highlight: row.highlight, description: row.description, image: row.image,
  ctaLabel: row.ctaLabel, ctaHref: row.ctaHref, secondaryLabel: row.secondaryLabel, secondaryHref: row.secondaryHref,
  theme: row.theme === "dark" ? "dark" : "light",
});

/** Active homepage promotions by placement. Falls back to the built-in set if the table is unavailable. */
export async function getHomepagePromotions(): Promise<HomepagePromotions> {
  "use cache";
  cacheLife("minutes");
  cacheTag(PROMOTIONS_TAG);
  try {
    const rows = await prisma.promotion.findMany({ orderBy: [{ placement: "asc" }, { position: "asc" }] });
    return groupPromotions(rows.map(toPromotion));
  } catch {
    console.error("Promotions unavailable; showing built-in promotions. Run `npm run db:setup-promotions`.");
    return groupPromotions(DEFAULT_PROMOTIONS);
  }
}
