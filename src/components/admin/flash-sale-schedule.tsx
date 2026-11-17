"use client";

import { useAdminFetch } from "./admin-data";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFeedback } from "@/components/feedback-provider";
import { bangkokDateInput, bangkokInputToISO, validateFlashSaleSettings, type FlashSaleSettings } from "@/lib/flash-sale";
import { productField, productPrimary } from "./product-editor";

async function read(response: Response): Promise<{ settings: FlashSaleSettings }> {
  if (response.status === 401 || response.status === 403) { window.location.replace("/auth/complete"); throw new Error("กรุณาตรวจสอบสิทธิ์การใช้งาน"); }
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "ดำเนินการไม่สำเร็จ กรุณาลองอีกครั้ง");
  return result;
}
export function FlashSaleSchedule() {
  const adminFetch = useAdminFetch("flash-sale");
  const router = useRouter(); const feedback = useFeedback();
  const [enabled, setEnabled] = useState(true);
  const [startsAt, setStartsAt] = useState(""); const [endsAt, setEndsAt] = useState("");
  const [loaded, setLoaded] = useState(false); const [pending, setPending] = useState(false);
  const [error, setError] = useState(""); const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setError("");
      try {
        const { settings } = await read(await adminFetch("/api/admin/flash-sale", { cache: "no-store", signal: controller.signal }));
        if (!controller.signal.aborted) { setEnabled(settings.enabled); setStartsAt(bangkokDateInput(settings.startsAt)); setEndsAt(bangkokDateInput(settings.endsAt)); setLoaded(true); }
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "โหลดเวลาไม่สำเร็จ"); }
    }
    void load(); return () => controller.abort();
  }, [revision, adminFetch]);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    try {
      const settings = validateFlashSaleSettings({ enabled, startsAt: bangkokInputToISO(startsAt), endsAt: bangkokInputToISO(endsAt) });
      await read(await adminFetch("/api/admin/flash-sale", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) }));
      router.refresh(); feedback({ title: "บันทึกเวลาแฟลชเซลแล้ว", description: "หน้าร้านจะเปิดและปิดตามเวลาที่ตั้งไว้" });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "บันทึกเวลาไม่สำเร็จ"); }
    finally { setPending(false); }
  }
  return <form onSubmit={save} aria-labelledby="flash-sale-schedule-title" aria-busy={!loaded || pending} className="space-y-3 rounded-xl border border-border bg-surface p-5">
    <div><h2 id="flash-sale-schedule-title" className="font-semibold">ช่วงเวลา</h2><p className="mt-1 text-sm text-muted">ใช้เวลาประเทศไทย</p></div>
    {error && <p role="alert" className="text-sm text-danger">{error}{!loaded && <button type="button" onClick={() => setRevision((value) => value + 1)} className="ml-3 underline">ลองใหม่</button>}</p>}
    <fieldset disabled={!loaded || pending} className="space-y-3 disabled:opacity-50">
      <label className="flex w-fit items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />เปิดใช้งานแฟลชเซล</label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">เริ่ม<input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className={productField} /></label><label className="text-sm">สิ้นสุด<input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className={productField} /></label></div>
      <p className="text-xs text-muted">เว้นว่างทั้งสองช่อง = เปิดทุกวัน · หมดเวลาแล้วกลับเป็นราคาปกติ</p>
      <div className="flex flex-wrap items-center gap-4"><button type="submit" className={productPrimary}>{pending ? "กำลังบันทึก…" : "บันทึกเวลา"}</button><button type="button" onClick={() => { setStartsAt(""); setEndsAt(""); }} className="text-sm text-muted underline">ล้างเวลา</button></div>
    </fieldset>
    {!loaded && !error && <p role="status" className="text-sm text-muted">กำลังโหลดเวลา…</p>}
  </form>;
}
