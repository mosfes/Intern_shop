"use client";

import { useMemo, useSyncExternalStore } from "react";
import { withFlashSalePrice } from "@/lib/flash-sale";
import type { Product } from "@/lib/types";

// Shared clock: one timeout, set for the next flash-sale start/end any mounted component cares about,
// updates prices at that boundary (even in an open cart). No polling between boundaries.
const MAX_DELAY = 2_147_483_647; // setTimeout's limit (~24.8 days); longer waits are re-armed.
const subscribers = new Map<() => void, number[]>();
let timer: ReturnType<typeof setTimeout> | undefined;

function schedule() {
  clearTimeout(timer);
  timer = undefined;
  const now = Date.now();
  let next = Infinity;
  for (const boundaries of subscribers.values()) for (const b of boundaries) if (b > now && b < next) next = b;
  if (next === Infinity) return;
  timer = setTimeout(() => {
    subscribers.forEach((_, notify) => notify());
    schedule();
  }, Math.min(next - now + 50, MAX_DELAY));
}

function boundariesOf(products: Product[]) {
  return products.flatMap((p) => [p.flashSale?.startsAt, p.flashSale?.endsAt].flatMap((date) => (date ? [Date.parse(date)] : [])));
}

/** The latest boundary already passed — pricing at this time gives the same result as pricing "now". */
function priceBoundary(boundaries: number[]) {
  const now = Date.now();
  let latest = 0;
  for (const b of boundaries) if (b <= now && b > latest) latest = b;
  return latest;
}

const serverSnapshot = () => 0;
export function usePriceTime(products: Product[]) {
  const key = boundariesOf(products).join(",");
  const { subscribe, getSnapshot } = useMemo(() => {
    const boundaries = key ? key.split(",").map(Number) : [];
    return {
      subscribe(notify: () => void) {
        if (!boundaries.length) return () => {};
        subscribers.set(notify, boundaries);
        schedule();
        return () => { subscribers.delete(notify); schedule(); };
      },
      getSnapshot: () => priceBoundary(boundaries),
    };
  }, [key]);
  // Snapshot changes only at sale boundaries, so nothing re-renders between them.
  return useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
}
export function usePricedProduct(product: Product) {
  return withFlashSalePrice(product, usePriceTime([product]));
}
