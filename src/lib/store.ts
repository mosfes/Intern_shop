"use client";

import { useSyncExternalStore } from "react";
import type { CartLine, DemoUser, Order, Product } from "./types";

/**
 * Tiny client-side store persisted to localStorage.
 * Uses useSyncExternalStore so server render + hydration see an empty state
 * and the persisted state is applied right after hydration (no mismatch).
 */
interface StoreState {
  cart: CartLine[];
  wishlist: string[];
  user: DemoUser | null;
  orders: Order[];
}

// v2: product ids now come from mockapi ("1", "2"…) instead of "p001" — old carts are dropped.
const STORAGE_KEY = "corebyte-store-v2";
const EMPTY: StoreState = { cart: [], wishlist: [], user: null, orders: [] };

let state: StoreState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoreState>;
      // Ids that no longer exist in the catalogue are skipped where the cart/wishlist is rendered.
      state = {
        cart: parsed.cart ?? [],
        wishlist: parsed.wishlist ?? [],
        user: parsed.user ?? null,
        orders: parsed.orders ?? [],
      };
    }
  } catch {
    state = EMPTY;
  }
}

function setState(updater: (s: StoreState) => StoreState) {
  load();
  state = updater(state);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable (private mode) — keep in-memory state */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      loaded = false;
      load();
      listeners.forEach((l) => l());
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  load();
  return state;
}

const getServerSnapshot = () => EMPTY;

export function useStore<T>(selector: (s: StoreState) => T): T {
  return selector(useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot));
}

/** True after hydration — lets UI show skeletons instead of an empty cart flash. */
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
const noopSubscribe = () => () => {};

// ---------------------------------------------------------------- actions
export const storeActions = {
  addToCart(product: Product, quantity = 1) {
    if (product.stock <= 0) return false;
    const productId = product.id;
    setState((s) => {
      const existing = s.cart.find((l) => l.productId === productId);
      const cart = existing
        ? s.cart.map((l) =>
            l.productId === productId ? { ...l, quantity: Math.min(product.stock, l.quantity + quantity) } : l,
          )
        : [...s.cart, { productId, quantity: Math.min(product.stock, quantity) }];
      return { ...s, cart };
    });
    return true;
  },
  setQuantity(product: Product, quantity: number) {
    const productId = product.id;
    setState((s) => ({
      ...s,
      cart: s.cart.map((l) =>
        l.productId === productId ? { ...l, quantity: Math.max(1, Math.min(product.stock, quantity)) } : l,
      ),
    }));
  },
  removeFromCart(productId: string) {
    setState((s) => ({ ...s, cart: s.cart.filter((l) => l.productId !== productId) }));
  },
  clearCart() {
    setState((s) => ({ ...s, cart: [] }));
  },
  /** Returns true when the product is now in the wishlist. */
  toggleWishlist(productId: string) {
    let added = false;
    setState((s) => {
      added = !s.wishlist.includes(productId);
      return {
        ...s,
        wishlist: added ? [...s.wishlist, productId] : s.wishlist.filter((id) => id !== productId),
      };
    });
    return added;
  },
  signIn(user: DemoUser) {
    setState((s) => ({ ...s, user }));
  },
  signOut() {
    setState((s) => ({ ...s, user: null }));
  },
  updateUser(patch: Partial<DemoUser>) {
    setState((s) => (s.user ? { ...s, user: { ...s.user, ...patch } } : s));
  },
  placeOrder(order: Order) {
    setState((s) => ({ ...s, orders: [order, ...s.orders], cart: [] }));
  },
};

// ---------------------------------------------------------------- selectors
export function useCartLines() {
  return useStore((s) => s.cart);
}

export function useCartCount() {
  return useStore((s) => s.cart.reduce((n, l) => n + l.quantity, 0));
}

export function useIsWishlisted(productId: string) {
  return useStore((s) => s.wishlist.includes(productId));
}

export function cartDetails(lines: CartLine[], productMap: Map<string, Product>) {
  const items = lines.flatMap((l) => {
    const product = productMap.get(l.productId);
    return product ? [{ ...l, product }] : [];
  });
  const subtotal = items.reduce((n, l) => n + l.product.price * l.quantity, 0);
  const savings = items.reduce((n, l) => n + (l.product.originalPrice - l.product.price) * l.quantity, 0);
  const count = items.reduce((n, l) => n + l.quantity, 0);
  return { items, subtotal, savings, count };
}
