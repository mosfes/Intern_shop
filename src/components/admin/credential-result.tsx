"use client";

import { Modal } from "@heroui/react";
import { useState } from "react";

export type CredentialResult = { username: string; password: string; account: string; kind: "created" | "reset" };

export function generateAccountPassword() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  return Array.from(crypto.getRandomValues(new Uint8Array(24)), (value) => alphabet[value & 63]).join("");
}

function CopyIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></svg>;
}

export function CredentialResultDialog({ result, onClose }: { result: CredentialResult; onClose: () => void }) {
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label); setError("");
    } catch {
      setCopied(""); setError("คัดลอกอัตโนมัติไม่ได้ กรุณาเลือกข้อความในช่องแล้วคัดลอกด้วยตนเอง");
    }
  }

  return <Modal.Backdrop isOpen onOpenChange={(open) => { if (!open) onClose(); }} isDismissable={false}>
    <Modal.Container size="md" placement="center" scroll="inside">
      <Modal.Dialog className="rounded-2xl bg-overlay p-6 text-foreground shadow-2xl">
        <Modal.CloseTrigger className="text-muted" />
        <Modal.Header className="pr-6"><Modal.Heading className="text-lg font-semibold">{result.kind === "reset" ? "รีเซ็ตรหัสผ่านสำเร็จ" : "สร้างบัญชีสำเร็จ"}</Modal.Heading></Modal.Header>
        <Modal.Body className="space-y-4 pt-3 text-foreground">
          <p className="break-words text-sm">{result.account} ({result.username})</p>
          <p className="mt-5 text-sm leading-relaxed text-success">{result.kind === "reset" ? "รีเซ็ต" : "สร้างบัญชี"}สำเร็จ กรุณาคัดลอกชื่อผู้ใช้งานและรหัสผ่านเพื่อส่งให้เจ้าของบัญชี ระบบจะแสดงรหัสผ่านนี้เพียงครั้งเดียว และเจ้าของบัญชีต้องเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบด้วยรหัสผ่านนี้ครั้งแรก</p>
          {([
            { label: "ชื่อผู้ใช้งาน", value: result.username, id: "username" },
            { label: "รหัสผ่านใหม่", value: result.password, id: "password" },
          ] as const).map(({ label, value, id }) => <label key={id} className="block text-xs font-medium text-muted">{label}<span className="mt-1.5 flex items-center gap-2 rounded-lg border border-border p-2"><input aria-label={label} value={value} readOnly autoComplete="off" spellCheck={false} onFocus={(event) => event.currentTarget.select()} className="min-w-0 flex-1 bg-transparent px-2 py-1.5 font-mono text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-accent/20" /><button type="button" aria-label={`คัดลอก${label}`} onClick={() => void copy(value, id)} className="inline-flex shrink-0 items-center gap-1 rounded-md bg-accent-soft px-2.5 py-2 text-xs text-accent hover:bg-accent/15"><CopyIcon />{copied === id ? "คัดลอกแล้ว" : "คัดลอก"}</button></span></label>)}
          <button type="button" onClick={() => void copy(`ชื่อผู้ใช้งาน: ${result.username}\nรหัสผ่าน: ${result.password}`, "all")} className="flex w-full items-center justify-center gap-2 rounded-lg border border-accent/30 px-3 py-2.5 text-sm font-medium text-accent hover:bg-accent-soft"><CopyIcon />{copied === "all" ? "คัดลอกแล้ว" : "คัดลอกชื่อผู้ใช้งานและรหัสผ่าน"}</button>
          <p role="status" className="sr-only">{copied ? "คัดลอกข้อมูลแล้ว" : ""}</p>
          {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
          <p className="text-xs leading-relaxed text-muted">เมื่อปิดหน้าต่างนี้ จะไม่สามารถเปิดดูรหัสผ่านเดิมได้อีก หากลืมรหัสผ่านให้รีเซ็ตใหม่</p>
        </Modal.Body>
        <Modal.Footer className="pt-5"><button type="button" onClick={onClose} className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90">ปิด</button></Modal.Footer>
      </Modal.Dialog>
    </Modal.Container>
  </Modal.Backdrop>;
}
