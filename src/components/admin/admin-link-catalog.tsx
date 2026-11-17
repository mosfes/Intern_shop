"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Modal } from "@heroui/react";
import { CatalogProvider } from "@/components/catalog-provider";
import type { Category, Product } from "@/lib/types";
import { useAdminDataState, useAdminFetch } from "./admin-data";

type Directory = { products: Product[]; categories: Category[]; brands?: { name: string; logoUrl: string | null }[] };

/** Only promotion link pickers need the full catalogue; other admin screens can open without it. */
export function AdminLinkCatalog({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const [data, setData] = useAdminDataState<Directory>("products");
  const adminFetch = useAdminFetch("products");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await adminFetch("/api/admin/products", { cache: "no-store", signal: controller.signal });
        if (response.status === 401 || response.status === 403) { window.location.replace("/auth/complete"); return; }
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "โหลดสินค้าไม่สำเร็จ");
        if (!controller.signal.aborted) setData(result);
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "โหลดสินค้าไม่สำเร็จ"); }
    })();
    return () => controller.abort();
  }, [adminFetch, setData, revision]);
  if (data) return <CatalogProvider data={{ products: data.products, categories: data.categories, brandAssets: data.brands }}>{children}</CatalogProvider>;
  return <Modal.Backdrop isOpen onOpenChange={(open) => { if (!open) onClose(); }}><Modal.Container size="sm"><Modal.Dialog><Modal.CloseTrigger /><Modal.Header><Modal.Heading>แก้ไขโปรโมชัน</Modal.Heading></Modal.Header><Modal.Body>
    {error ? <p role="alert">{error} <button type="button" onClick={() => { setError(""); setRevision((value) => value + 1); }} className="underline">ลองใหม่</button></p> : <p role="status">กำลังโหลดสินค้าสำหรับเลือกลิงก์…</p>}
  </Modal.Body></Modal.Dialog></Modal.Container></Modal.Backdrop>;
}
