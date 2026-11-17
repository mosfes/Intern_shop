import type { SavedAddress } from "./addresses";

type Snapshot = { addresses: SavedAddress[] | null; failed: boolean };
const empty: Snapshot = { addresses: null, failed: false };
const maxAge = 60_000;
let entry: { account: string; snapshot: Snapshot; loadedAt: number; request?: Promise<void> } | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export function subscribeAddresses(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function addressSnapshot(account: string | null): Snapshot {
  return account && entry?.account === account ? entry.snapshot : empty;
}

export function clearAddressBook() {
  entry = null;
  notify();
}

/** Ignore late mutation completions from a customer who has already signed out. */
export function reloadAddressBook(account: string): Promise<void> {
  return entry?.account === account ? loadAddressBook(account, true) : Promise.resolve();
}

/** Memory only: share preloads across navigation, never across accounts or sign-outs. */
export function loadAddressBook(account: string, force = false): Promise<void> {
  if (entry?.account !== account) entry = { account, snapshot: empty, loadedAt: 0 };
  const current = entry;
  if (!force) {
    if (current.request) return current.request;
    if (current.loadedAt && Date.now() - current.loadedAt < maxAge) return Promise.resolve();
  }
  const request = Promise.resolve().then(async () => {
    try {
      const response = await fetch("/api/addresses", { cache: "no-store" });
      if (!response.ok) throw new Error("load failed");
      const { addresses } = await response.json() as { addresses: SavedAddress[] };
      if (entry !== current || current.request !== request) return;
      current.snapshot = { addresses, failed: false };
      current.loadedAt = Date.now();
    } catch {
      if (entry !== current || current.request !== request) return;
      current.snapshot = { addresses: current.snapshot.addresses ?? [], failed: true };
    } finally {
      if (entry === current && current.request === request) {
        current.request = undefined;
        notify();
      }
    }
  });
  current.request = request;
  return request;
}
