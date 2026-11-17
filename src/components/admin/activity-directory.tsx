"use client";

import { useEffect, useState } from "react";
import { adminDevice } from "@/lib/admin-device";
import { AdminPageHeader } from "./user-directory";

type Log = { ipAddress: string | null; userAgent: string | null; country: string | null; region: string | null; city: string | null; contextSource: string | null; id: string; actorName: string; actorEmail: string; resource: string; action: string; target: string; status: number; createdAt: string };
const resources: Record<string, string> = { auth: "การเข้าสู่ระบบ", products: "สินค้า", brand: "แบรนด์", category: "หมวดหมู่", promotions: "โปรโมชัน", "flash-sale": "แฟลชเซล", "discount-codes": "โค้ดส่วนลด", users: "ผู้ใช้", orders: "คำสั่งซื้อ" };
const actions: Record<string, string> = { LOGIN_PASSWORD: "เข้าสู่ระบบด้วยรหัสผ่าน", LOGIN_GOOGLE: "เข้าสู่ระบบด้วย Google", LOGOUT: "ออกจากระบบ", POST: "สร้าง", PUT: "แก้ไข", PATCH: "เปลี่ยนสถานะ / แก้ไข", DELETE: "ลบ", addAdmin: "เพิ่มแอดมิน", removeAdmin: "ถอดสิทธิ์แอดมิน", setCredentials: "ตั้งข้อมูลเข้าสู่ระบบ", updateUser: "แก้ไขผู้ใช้ / สิทธิ์", updateCustomer: "แก้ไขลูกค้า" };

export function ActivityDirectory() {
  const [page, setPage] = useState(1);
  const [resource, setResource] = useState("");
  const [result, setResult] = useState<{ logs: Log[]; total: number } | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setResult(null); setError("");
      try {
        const response = await fetch(`/api/admin/logs?page=${page}&resource=${encodeURIComponent(resource)}`, { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "โหลดประวัติไม่สำเร็จ");
        if (!controller.signal.aborted) setResult(data);
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "โหลดประวัติไม่สำเร็จ"); }
    }
    void load();
    return () => controller.abort();
  }, [page, resource, revision]);
  return <>
    <AdminPageHeader title="ประวัติกิจกรรมแอดมิน" description="ตรวจสอบการจัดการข้อมูล ผู้ดำเนินการ และผลลัพธ์" />
    <section className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">ประเภท <select value={resource} onChange={(event) => { setResource(event.target.value); setPage(1); }} className="ml-2 rounded-lg border border-border bg-surface p-2"><option value="">ทั้งหมด</option>{Object.entries(resources).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button type="button" className="rounded-lg border border-border px-3 py-2 text-sm" onClick={() => setRevision((value) => value + 1)}>รีเฟรช</button>
      </div>
      {error ? <p role="alert" className="text-danger">{error}</p> : !result ? <p role="status" className="py-8 text-center text-muted">กำลังโหลดประวัติ…</p> : <>
        <p className="text-sm text-muted">ทั้งหมด {result.total.toLocaleString("th-TH")} รายการ</p>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-border">{["เวลา (ประเทศไทย)", "ผู้ดำเนินการ", "ประเภท", "กิจกรรม", "รายการ", "IP", "สถานที่โดยประมาณ", "เบราว์เซอร์ / อุปกรณ์", "ผลลัพธ์"].map((label) => <th key={label} className="whitespace-nowrap p-3">{label}</th>)}</tr></thead><tbody>
          {result.logs.map((log) => <tr key={log.id} className="border-b border-border align-top"><td className="whitespace-nowrap p-3">{new Date(log.createdAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</td><td className="p-3"><p>{log.actorName}</p><p className="text-xs text-muted">{log.actorEmail}</p></td><td className="whitespace-nowrap p-3">{resources[log.resource] || log.resource}</td><td className="whitespace-nowrap p-3">{actions[log.action] || log.action}</td><td className="max-w-64 break-words p-3">{log.target || "—"}</td><td className="whitespace-nowrap p-3 font-mono text-xs">{log.ipAddress || "ไม่ทราบ"}</td><td className="p-3"><p>{[log.city, log.region, log.country].filter(Boolean).join(", ") || "ไม่ทราบ"}</p>{log.contextSource && <p className="text-xs text-muted">{log.contextSource}</p>}</td><td className="min-w-52 p-3">{log.userAgent ? <details><summary className="cursor-pointer">{adminDevice(log.userAgent)}</summary><p className="mt-2 max-w-80 break-words text-xs text-muted">{log.userAgent}</p></details> : "ไม่ทราบ"}</td><td className={`whitespace-nowrap p-3 ${log.status >= 400 ? "text-danger" : "text-muted"}`}>{log.status === 0 ? "ยังไม่ยืนยันผล" : log.status < 300 ? "สำเร็จ" : `ไม่สำเร็จ (${log.status})`}</td></tr>)}
        </tbody></table>{result.logs.length === 0 && <p className="py-8 text-center text-muted">ยังไม่มีประวัติกิจกรรม</p>}</div>
        <div className="flex items-center justify-end gap-3 text-sm"><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border border-border px-3 py-2 disabled:opacity-40">ก่อนหน้า</button><span>หน้า {page}</span><button type="button" disabled={page * 25 >= result.total} onClick={() => setPage(page + 1)} className="rounded border border-border px-3 py-2 disabled:opacity-40">ถัดไป</button></div>
      </>}
    </section>
  </>;
}
