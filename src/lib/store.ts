"use client";

import { clearAddressBook, loadAddressBook } from "./address-book-cache";
import { toast } from "@heroui/react";
import { useSyncExternalStore } from "react";
import type { CartLine, DemoUser, Order, Product } from "./types";
import type { PcBuild } from "./pc-builder";
import { MAX_CART_LINES, MAX_LINE_QUANTITY, limitCartLines } from "./cart-limits";

/**
 * Tiny client-side store persisted to localStorage.
 * Uses useSyncExternalStore so server render + hydration see an empty state
 * and the persisted state is applied right after hydration (no mismatch).
 */
interface StoreState {
  pcBuild: PcBuild;
  cart: CartLine[];
  wishlist: string[];
  user: DemoUser | null;
  orders: Order[];
  /** Account whose saved (server) cart this browser's cart mirrors; null = a guest cart. */
  cartOwner: string | null;
  /** Local cart edits the server hasn't confirmed yet. */
  cartDirty: boolean;
}

// v2: product ids now come from mockapi ("1", "2"…) instead of "p001" — old carts are dropped.
const STORAGE_KEY = "corebyte-store-v2";
const EMPTY: StoreState = { cart: [], wishlist: [], user: null, orders: [], pcBuild: {}, cartOwner: null, cartDirty: false };

/** Shown wherever an admin account tries to shop; admins manage the store, they don't order from it. */
export const ADMIN_ORDER_BLOCKED_MESSAGE = "บัญชีแอดมินไม่สามารถสั่งซื้อสินค้าได้ กรุณาใช้บัญชีลูกค้า";

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
        pcBuild: parsed.pcBuild ?? {},
        cart: limitCartLines(parsed.cart ?? []),
        wishlist: parsed.wishlist ?? [],
        user: parsed.user ?? null,
        orders: parsed.orders ?? [],
        cartOwner: parsed.cartOwner ?? null,
        cartDirty: parsed.cartDirty ?? false,
      };
    }
  } catch {
    state = EMPTY;
  }
}

function setState(updater: (s: StoreState) => StoreState, fromServer = false) {
  load();
  const previousCart = state.cart;
  const previousAccount = state.user?.googleId;
  state = updater(state);
  if (previousAccount !== state.user?.googleId) clearAddressBook();
  // A local cart edit on a synced account must be saved to the server.
  if (!fromServer && state.cart !== previousCart && state.user?.googleId && state.cartOwner === state.user.googleId) {
    state = { ...state, cartDirty: true };
    scheduleCartPush();
  }
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
      const previousAccount = state.user?.googleId;
      loaded = false;
      load();
      if (previousAccount !== state.user?.googleId) clearAddressBook();
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

// ---------------------------------------------------------------- cart <-> account sync
// Signed-in customers' carts live in the database (/api/cart); localStorage stays the fast
// working copy and the only copy for guests. Failures are silent: the cart keeps working
// locally, stays flagged dirty, and is retried on the next refresh.
const normalizeLines = (lines: CartLine[]) => lines.map((l) => ({ productId: l.productId, quantity: l.quantity, selected: l.selected !== false }));

/** `skipped` counts guest products left out because the account's cart is already full. */
function mergeCarts(remote: CartLine[], local: CartLine[]): { cart: CartLine[]; skipped: number } {
  let skipped = 0;
  const merged = new Map(normalizeLines(remote).map((l) => [l.productId, l]));
  for (const line of normalizeLines(local)) {
    const existing = merged.get(line.productId);
    if (existing) existing.quantity = Math.max(existing.quantity, line.quantity);
    else if (merged.size < MAX_CART_LINES) merged.set(line.productId, line);
    else skipped += 1;
  }
  return { cart: limitCartLines([...merged.values()]), skipped };
}

const cartKey = (lines: CartLine[]) =>
  JSON.stringify(normalizeLines(lines).sort((a, b) => a.productId.localeCompare(b.productId)));

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let inflightPush: Promise<void> | null = null;
let pulling = false;

function syncedAccount() {
  const user = state.user;
  return user?.googleId && user.role !== "admin" ? user.googleId : null;
}

function scheduleCartPush(delay = 600) {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void flushCart(), delay);
}

function flushCart(): Promise<void> {
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  if (inflightPush) return inflightPush.then(flushCart); // then send anything newer
  load();
  const account = syncedAccount();
  if (!account || state.cartOwner !== account || !state.cartDirty) return Promise.resolve();
  const sent = state.cart;
  inflightPush = fetch("/api/cart", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cart: normalizeLines(sent) }),
  })
    .then((response) => {
      if (response.ok && state.cart === sent) setState((s) => ({ ...s, cartDirty: false }), true);
    })
    .catch(() => {})
    .finally(() => {
      inflightPush = null;
    });
  return inflightPush;
}

async function pullCart() {
  load();
  const account = syncedAccount();
  if (!account || pulling) return;
  pulling = true;
  try {
    const response = await fetch("/api/cart", { cache: "no-store" });
    if (!response.ok) return;
    const { cart: remote } = (await response.json()) as { cart: CartLine[] };
    if (syncedAccount() !== account) return; // signed out or switched account meanwhile
    const unsaved = state.cartOwner === account && state.cartDirty;
    let next: CartLine[];
    let skipped = 0;
    if (unsaved) next = state.cart; // offline/unsaved edits on this device win
    else if (state.cartOwner === null) ({ cart: next, skipped } = mergeCarts(remote, state.cart)); // guest cart joins the account
    else next = remote; // already mirrors this account (or another account's leftovers): server wins
    const needsSave = unsaved || cartKey(next) !== cartKey(remote);
    if (cartKey(next) !== cartKey(state.cart) || state.cartOwner !== account || state.cartDirty !== needsSave) {
      setState((s) => ({ ...s, cart: cartKey(next) === cartKey(s.cart) ? s.cart : next, cartOwner: account, cartDirty: needsSave }), true);
    }
    if (skipped > 0) {
      toast.warning("ตะกร้าของบัญชีเต็มแล้ว", {
        description: `สินค้า ${skipped} รายการที่เลือกไว้ก่อนเข้าสู่ระบบไม่ได้ถูกเพิ่ม (ตะกร้าใส่ได้สูงสุด ${MAX_CART_LINES} รายการ)`,
      });
    }
    if (needsSave) await flushCart();
  } catch {
    /* offline or table missing — keep the local cart */
  } finally {
    pulling = false;
  }
}

// ---------------------------------------------------------------- actions
export const storeActions = {
  savePcBuild(pcBuild: PcBuild) {
    setState((s) => ({ ...s, pcBuild }));
  },
  addBuildToCart(products: Product[]) {
    load();
    if (state.user?.role === "admin") return false;
    const inCart = (p: Product) => state.cart.find((line) => line.productId === p.id)?.quantity ?? 0;
    if (!products.length || products.some((p) => Math.min(p.stock, MAX_LINE_QUANTITY) <= inCart(p))) return false;
    if (state.cart.length + products.filter((p) => !inCart(p)).length > MAX_CART_LINES) return false;
    setState((s) => {
      const cart = s.cart.map((line) => ({ ...line }));
      for (const product of products) {
        const line = cart.find((item) => item.productId === product.id);
        if (line) {
          line.quantity += 1;
          line.selected = true;
        }
        else cart.push({ productId: product.id, quantity: 1 });
      }
      return { ...s, cart };
    });
    return true;
  },
  addToCart(product: Product, quantity = 1) {
    if (state.user?.role === "admin") return false;
    if (product.stock <= 0) return false;
    load();
    const productId = product.id;
    const cap = Math.min(product.stock, MAX_LINE_QUANTITY);
    const existing = state.cart.find((l) => l.productId === productId);
    // Nothing to add when the line is already full or the cart has no room for a new product.
    if (existing ? existing.quantity >= cap : state.cart.length >= MAX_CART_LINES) return false;
    setState((s) => {
      const cart = existing
        ? s.cart.map((l) =>
            l.productId === productId ? { ...l, quantity: Math.min(cap, l.quantity + quantity), selected: true } : l,
          )
        : [...s.cart, { productId, quantity: Math.min(cap, quantity) }];
      return { ...s, cart };
    });
    return true;
  },
  setQuantity(product: Product, quantity: number) {
    const productId = product.id;
    setState((s) => ({
      ...s,
      cart: s.cart.map((l) =>
        l.productId === productId ? { ...l, quantity: Math.max(1, Math.min(product.stock, MAX_LINE_QUANTITY, quantity)) } : l,
      ),
    }));
  },
  toggleSelected(productId: string) {
    setState((s) => ({
      ...s,
      cart: s.cart.map((l) => (l.productId === productId ? { ...l, selected: l.selected === false } : l)),
    }));
  },
  setAllSelected(selected: boolean) {
    setState((s) => ({ ...s, cart: s.cart.map((l) => ({ ...l, selected })) }));
  },
  removeFromCart(productId: string) {
    setState((s) => ({ ...s, cart: s.cart.filter((l) => l.productId !== productId) }));
  },
  /** Undo for removeFromCart: puts the line back as it was. Never adds to a line that is
   * already in the cart, so pressing "undo" more than once cannot stack quantity. */
  restoreLine(product: Product, quantity: number, selected = true) {
    if (state.user?.role === "admin" || product.stock <= 0) return false;
    if (state.cart.some((l) => l.productId === product.id)) return false;
    if (state.cart.length >= MAX_CART_LINES) return false;
    const line = { productId: product.id, quantity: Math.max(1, Math.min(product.stock, MAX_LINE_QUANTITY, quantity)), selected };
    setState((s) => ({ ...s, cart: [...s.cart, line] }));
    return true;
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
  async signOut() {
    await flushCart(); // save any pending edits while the session cookie still exists
    const response = await fetch("/api/auth/session", { method: "DELETE" });
    if (!response.ok) throw new Error("Sign out failed");
    // The saved cart stays with the account; this browser goes back to an empty guest cart.
    setState((s) => ({ ...s, user: null, orders: [], cart: [], cartOwner: null, cartDirty: false }), true);
  },
  syncGoogleUser(user: DemoUser | null) {
    setState((s) => {
      if (user) {
        // Retain editable contact details for the same Google identity.
        const sameAccount = s.user?.googleId === user.googleId;
        return { ...s, orders: sameAccount ? s.orders : [], user: sameAccount ? { ...s.user, ...user } : user };
      }
      // Session ended (e.g. expired): what's left here becomes a guest cart that merges on the next login.
      return s.user?.googleId ? { ...s, user: null, orders: [], cartOwner: null, cartDirty: false } : s;
    });
    if (user?.googleId && user.role !== "admin") void loadAddressBook(user.googleId);
    void Promise.all([storeActions.refreshOrders(), pullCart()]);
  },
  /** Refresh server orders, including payments completed with the browser closed. */
  async refreshOrders() {
    load();
    const account = syncedAccount();
    if (!account) return;
    try {
      const response = await fetch("/api/orders", { cache: "no-store" });
      if (!response.ok) return;
      const result = await response.json();
      if (syncedAccount() !== account || !Array.isArray(result.orders)) return;
      const orders = result.orders as Order[];
      setState((s) => {
        const merged = new Map(s.orders.filter((order) => order.paymentStatus !== "pending").map((order) => [order.id, order]));
        for (const order of orders) merged.set(order.id, order);
        return { ...s, orders: [...merged.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) };
      }, true);
    } catch { /* Retry on the next visit or tab focus; retain cached orders offline. */ }
  },
  /** Re-reads the saved cart (e.g. when the tab regains focus), pushing local edits first if any. */
  refreshCart() {
    void pullCart();
  },
  updateUser(patch: Partial<DemoUser>) {
    setState((s) => (s.user ? { ...s, user: { ...s.user, ...patch } } : s));
  },
  /** Returns false (and places nothing) for admin accounts and signed-out visitors. */
  placeOrder(order: Order) {
    load();
    if (!state.user || state.user.role === "admin") return false;
    // The same paid order can be settled more than once (reload, second tab); keep one copy.
    if (state.orders.some((o) => o.id === order.id && o.paymentStatus !== "pending")) return true;
    // Only the lines that were ordered leave the cart; unticked items stay for later.
    const ordered = new Set(order.lines.map((l) => l.productId));
    setState((s) => ({ ...s, orders: [order, ...s.orders.filter((existing) => existing.id !== order.id)], cart: s.cart.filter((l) => !ordered.has(l.productId)) }));
    return true;
  },
};

// ---------------------------------------------------------------- selectors
export function useIsAdmin() {
  return useStore((s) => s.user?.role === "admin");
}

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
    return product ? [{ ...l, selected: l.selected !== false, product }] : [];
  });
  // Totals only cover ticked lines — those are what checkout will order.
  const selectedItems = items.filter((l) => l.selected);
  const subtotal = selectedItems.reduce((n, l) => n + l.product.price * l.quantity, 0);
  const savings = selectedItems.reduce((n, l) => n + (l.product.originalPrice - l.product.price) * l.quantity, 0);
  const count = items.reduce((n, l) => n + l.quantity, 0);
  const selectedCount = selectedItems.reduce((n, l) => n + l.quantity, 0);
  return { items, selectedItems, subtotal, savings, count, selectedCount };
}
