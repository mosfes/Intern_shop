"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { AddressInput } from "@/lib/addresses";

import { addressSnapshot, loadAddressBook, reloadAddressBook, subscribeAddresses } from "./address-book-cache";

export type AddressResult = { ok: true } | { ok: false; message: string };

async function call(url: string, method: string, body?: unknown): Promise<AddressResult> {
  try {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.ok) return { ok: true };
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    return { ok: false, message: data.error ?? "ดำเนินการไม่สำเร็จ กรุณาลองอีกครั้ง" };
  } catch {
    return { ok: false, message: "เชื่อมต่อไม่ได้ กรุณาลองอีกครั้ง" };
  }
}

/** Shared, account-scoped addresses; preloaded after session verification. */
export function useAddressBook(account: string | null) {
  const { addresses, failed } = useSyncExternalStore(
    subscribeAddresses,
    () => addressSnapshot(account),
    () => addressSnapshot(null),
  );
  const reload = useCallback(() => account ? reloadAddressBook(account) : Promise.resolve(), [account]);

  useEffect(() => {
    if (account) void loadAddressBook(account);
  }, [account]);

  const run = async (result: Promise<AddressResult>) => {
    const outcome = await result;
    if (outcome.ok) await reload();
    return outcome;
  };

  return {
    addresses,
    failed,
    reload,
    add: (input: AddressInput, isDefault = false) => run(call("/api/addresses", "POST", { ...input, isDefault })),
    update: (id: string, input: AddressInput, isDefault = false) => run(call(`/api/addresses/${id}`, "PUT", { ...input, isDefault })),
    makeDefault: (id: string) => run(call(`/api/addresses/${id}`, "PUT", { isDefault: true })),
    remove: (id: string) => run(call(`/api/addresses/${id}`, "DELETE")),
  };
}
