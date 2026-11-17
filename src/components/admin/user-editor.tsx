"use client";

import { Label, Modal, Switch } from "@heroui/react";
import { useState, type FormEvent } from "react";
import { generateAccountPassword, type CredentialResult } from "./credential-result";
import type { Row } from "./user-directory";

const field = "mt-1.5 h-10 w-full rounded-lg border border-[var(--field-border)] bg-[var(--field-background)] px-3 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:bg-surface-secondary disabled:text-muted";
const primary = "rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm hover:opacity-90 disabled:opacity-50";

type Props = { row: Row | null; username: string; pending: boolean; mutate: (body: Record<string, unknown>) => Promise<boolean>; onClose: () => void; onCredentialsReady: (result: CredentialResult) => void };

export function UserEditor({ row, username, pending, mutate, onClose, onCredentialsReady }: Props) {
  const [error, setError] = useState("");
  const [resetting, setResetting] = useState(false);
  const [active, setActive] = useState(!row?.disabled);
  const busy = pending;
  const nameParts = row?.name.split(" ") ?? [];

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!row) return;
    const form = new FormData(event.currentTarget);
    setError("");
    const ok = await mutate({ action: "updateUser", email: row.email, name: `${form.get("firstName") ?? ""} ${form.get("lastName") ?? ""}`.trim(), phone: form.get("phone"), role: row.role, disabled: !active });
    if (ok) onClose(); else setError("บันทึกไม่สำเร็จ กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง");
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!row) return;
    const form = new FormData(event.currentTarget);
    setError("");
    const password = generateAccountPassword();
    const login = (username || String(form.get("username"))).toLowerCase();
    if (await mutate({ action: "setCredentials", email: row.email, username: login, password })) {
      onCredentialsReady({ kind: "reset", account: row.name, username: login, password });
      setResetting(false);
    }
    else setError("รีเซ็ตรหัสผ่านไม่สำเร็จ กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง");
  }

  return <Modal.Backdrop isOpen={!!row} onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <Modal.Container size="lg" placement="center" scroll="inside">
      <Modal.Dialog className="max-w-[512px] overflow-hidden rounded-2xl bg-overlay p-0 text-foreground shadow-2xl">
        <Modal.CloseTrigger isDisabled={busy} className="text-muted" />
        <Modal.Header className="border-b border-border px-6 py-5"><Modal.Heading className="text-lg font-semibold">{resetting ? "รีเซ็ตรหัสผ่าน" : "แก้ไขผู้ใช้"}</Modal.Heading></Modal.Header>
        <Modal.Body className="m-0 px-6 py-5 text-foreground">
          {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          {row && (resetting ? <form id="reset-user-password" onSubmit={resetPassword} className="space-y-4">
            <p className="break-all text-sm text-muted">รีเซ็ตรหัสผ่านสำหรับ {row.email} ระบบจะสร้างรหัสผ่านใหม่ให้คัดลอก การเปลี่ยนรหัสผ่านจะออกจากระบบในอุปกรณ์ที่ใช้รหัสผ่านเดิม</p>
            {!username && <label className="block text-sm font-medium">ชื่อผู้ใช้งาน<input name="username" required minLength={3} maxLength={64} pattern="[a-zA-Z0-9][a-zA-Z0-9._\-]{2,63}" className={field} autoComplete="off" /></label>}

          </form> : <form id="edit-directory-user" onSubmit={save} className="space-y-4">
            <fieldset disabled={busy} className="space-y-4 disabled:opacity-70">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">ชื่อ<input name="firstName" defaultValue={nameParts[0]} required maxLength={120} disabled={!row.account} className={field} /></label><label className="block text-sm font-medium">นามสกุล<input name="lastName" defaultValue={nameParts.slice(1).join(" ")} maxLength={120} disabled={!row.account} className={field} /></label></div>
              <label className="block text-sm font-medium">ชื่อผู้ใช้งาน (Username)<input value={username || "ยังไม่ได้ตั้งค่า"} disabled className={field} /><span className="mt-1 block text-xs font-normal text-muted">ไม่สามารถแก้ไขชื่อผู้ใช้งานได้</span></label>
              <label className="block text-sm font-medium">อีเมล<input value={row.email} disabled className={field} /></label>
              <label className="block text-sm font-medium">เบอร์โทรศัพท์<input name="phone" type="tel" defaultValue={row.phone} maxLength={30} disabled={!row.account} className={field} /></label>
              <Switch aria-label="เปิดใช้งานบัญชี" isSelected={active} onChange={setActive} isDisabled={busy || !row.account} className="w-full rounded-xl border border-border bg-surface-secondary/50 p-4">
                <Switch.Content className="w-full justify-between gap-4">
                  <span className="min-w-0"><Label className="text-sm font-semibold">เปิดใช้งานบัญชี</Label><span className="mt-1 block text-xs leading-relaxed text-muted">{active ? "บัญชีนี้สามารถเข้าสู่ระบบได้" : "บัญชีนี้ถูกระงับการเข้าสู่ระบบ"}</span></span>
                  <Switch.Control><Switch.Thumb /></Switch.Control>
                </Switch.Content>
              </Switch>
              {!row.account && <p className="text-xs text-muted">แก้ไขข้อมูลโปรไฟล์ได้หลังเข้าสู่ระบบครั้งแรก</p>}
            </fieldset>
          </form>)}
        </Modal.Body>
        <Modal.Footer className="mx-6 flex flex-wrap items-center justify-between gap-3 border-t border-border px-0 py-4">
          {resetting ? <button type="button" disabled={busy} onClick={() => { setResetting(false); setError(""); }} className="text-sm text-muted">กลับ</button> : <button type="button" disabled={busy || row?.role !== "admin"} title={row?.role !== "admin" ? "บัญชีลูกค้าเข้าสู่ระบบด้วย Google" : undefined} onClick={() => { setResetting(true); setError(""); }} className="inline-flex items-center gap-2 text-sm font-medium text-accent disabled:opacity-40"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M15 3a6 6 0 0 0-5.6 8.2L3 17.6V21h3.4l1.8-1.8v-2.4h2.4l2.2-2.2A6 6 0 1 0 15 3Z" /><circle cx="17" cy="7" r="1" /></svg>รีเซ็ตรหัสผ่าน</button>}
          <div className="ml-auto flex items-center gap-5"><button type="button" disabled={busy} onClick={onClose} className="text-sm font-medium text-muted">ยกเลิก</button><button type="submit" form={resetting ? "reset-user-password" : "edit-directory-user"} disabled={busy} className={primary}>{busy ? "กำลังบันทึก…" : resetting ? "รีเซ็ตรหัสผ่าน" : "บันทึกข้อมูล"}</button></div>
        </Modal.Footer>
      </Modal.Dialog>
    </Modal.Container>
  </Modal.Backdrop>;
}
