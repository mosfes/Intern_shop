"use client";

import { createContext, use, useCallback, useState, useSyncExternalStore, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { AdminViewCache } from "@/lib/admin-view-cache";

const Context = createContext<AdminViewCache | null>(null);
export function AdminDataProvider({ children }: { children: ReactNode }) {
  const [cache] = useState(() => new AdminViewCache());
  return <Context value={cache}>{children}</Context>;
}
function useCache() {
  const cache = use(Context);
  if (!cache) throw new Error("Admin data needs AdminDataProvider");
  return cache;
}
export function useAdminDataState<T>(key: string): [T | null, Dispatch<SetStateAction<T | null>>] {
  const cache = useCache();
  const data = useSyncExternalStore(cache.subscribe, () => cache.get<T>(key), () => null);
  const setData = useCallback((value: SetStateAction<T | null>) => cache.set<T>(key, value), [cache, key]);
  return [data, setData];
}
export function useAdminFetch(key: string) {
  const cache = useCache();
  return useCallback((url: string, init?: RequestInit) => cache.request(key, url, init), [cache, key]);
}
