"use client";

import { useCallback, useEffect, useState } from "react";
import type { AddressInput, SavedAddress } from "@/lib/addresses";

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

async function fetchAddresses() {
  const response = await fetch("/api/addresses", { cache: "no-store" });
  if (!response.ok) throw new Error("load failed");
  return ((await response.json()) as { addresses: SavedAddress[] }).addresses;
}

/** The signed-in customer's saved addresses. `addresses` is null until the first load finishes. */
export function useAddressBook(enabled: boolean) {
  const [addresses, setAddresses] = useState<SavedAddress[] | null>(null);
  const [failed, setFailed] = useState(false);

  const reload = useCallback(async () => {
    try {
      const list = await fetchAddresses();
      setAddresses(list);
      setFailed(false);
    } catch {
      setFailed(true);
      setAddresses((current) => current ?? []);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    fetchAddresses().then(
      (list) => active && (setAddresses(list), setFailed(false)),
      () => active && (setFailed(true), setAddresses((current) => current ?? [])),
    );
    return () => {
      active = false;
    };
  }, [enabled]);

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
