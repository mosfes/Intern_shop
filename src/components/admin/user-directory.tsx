"use client";

import { Avatar, Label, ListBox, Modal, Select, Switch, buttonVariants } from "@heroui/react";
import { UserEditor } from "./user-editor";
import { CredentialResultDialog, generateAccountPassword, type CredentialResult } from "./credential-result";
import { useState, type ReactNode } from "react";
import { EditIcon, PlusIcon, SearchIcon, ShieldIcon, UserIcon } from "@/components/icons";

export type Account = { googleId: string; email: string; name: string; phone: string; picture?: string | null; disabled: boolean; role: "admin" | "customer"; createdAt: string; lastLogin: string };
export type Directory = { admins: string[]; users: Account[]; credentials?: { email: string; username: string | null }[] };
export type Row = { id: string; email: string; name: string; phone: string; picture?: string | null; role: "admin" | "customer"; disabled: boolean; account?: Account };
const inputClass = "h-10 w-full rounded-lg border border-[var(--field-border)] bg-[var(--field-background)] px-3 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15";
const buttonClass = `${buttonVariants()} gap-2 rounded-lg`;

export function AdminPageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="flex flex-wrap items-end justify-between gap-4">
    <div><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1><p className="mt-2 text-muted">{description}</p></div>
    {action}
  </div>;
}

export function UserDirectory({ data, adminsOnly, pending, mutate, onCredentialsClose }: { data: Directory; adminsOnly: boolean; pending: boolean; mutate: (body: Record<string, unknown>) => Promise<boolean>; onCredentialsClose?: () => void }) {
  const [credentialResult, setCredentialResult] = useState<CredentialResult | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<Row | null>(null);
  const [adding, setAdding] = useState(false);
  const [newAccountActive, setNewAccountActive] = useState(true);
  const [dialogError, setDialogError] = useState("");
  const rows: Row[] = [
    ...data.users.map((account) => ({ id: account.googleId, email: account.email, name: account.name, phone: account.phone, picture: account.picture, disabled: account.disabled, role: account.role, account })),
    ...data.admins.filter((email) => !data.users.some((account) => account.email === email)).map((email) => ({ id: email, email, name: "รอเข้าสู่ระบบครั้งแรก", phone: "", role: "admin" as const, disabled: false })),
  ];
  const sectionRows = rows.filter((row) => row.role === (adminsOnly ? "admin" : "customer"));
  const visible = sectionRows.filter((row) => (status === "all" || (status === "pending" ? !row.account : status === "disabled" ? row.disabled : !!row.account && !row.disabled)) && `${row.name} ${row.email} ${row.phone}`.toLowerCase().includes(query.trim().toLowerCase()));
  const customers = data.users.filter((account) => account.role === "customer");
  const cards = [
    { label: "ผู้ใช้ทั้งหมด", value: rows.length, icon: UserIcon, color: "bg-accent-soft text-accent" },
    { label: "แอดมิน", value: data.admins.length, icon: ShieldIcon, color: "bg-accent-soft text-accent" },
    { label: "ลูกค้า", value: customers.length, icon: UserIcon, color: "bg-accent-soft text-accent" },
    { label: "บัญชีที่ถูกระงับ", value: data.users.filter((account) => account.disabled).length, icon: ShieldIcon, color: "bg-danger-soft text-danger" },
  ];
  return <div className="space-y-6">
    <AdminPageHeader title={adminsOnly ? "แอดมินในระบบ" : "ลูกค้าในระบบ"} description={adminsOnly ? "จัดการรายชื่อและสิทธิ์แอดมิน" : "จัดการข้อมูลลูกค้าและสถานะการใช้งานบัญชี"} action={adminsOnly && <button type="button" className={buttonClass} onClick={() => { setNewAccountActive(true); setAdding(true); setDialogError(""); }}><PlusIcon size={17} />เพิ่มแอดมิน</button>} />
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 sm:gap-4">{cards.map((card) => <div key={card.label} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 sm:gap-4 sm:p-5"><span className={`grid size-11 shrink-0 place-items-center rounded-lg ${card.color}`}><card.icon size={21} /></span><div><p className="text-xs font-medium text-muted sm:text-sm">{card.label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{card.value}</p></div></div>)}</div>
    <section className="overflow-hidden rounded-xl border border-border bg-surface" aria-label="รายชื่อผู้ใช้">
      <div className="grid gap-3 border-b border-border p-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <label className="relative"><span className="sr-only">ค้นหาผู้ใช้</span><SearchIcon size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาชื่อ อีเมล หรือเบอร์โทรศัพท์..." className={`${inputClass} pl-9`} /></label>

        <Select aria-label="กรองสถานะ" value={status} onChange={(key) => { if (key) setStatus(String(key)); }} className="w-full">
          <Select.Trigger className="min-h-10 rounded-lg"><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover><ListBox><ListBox.Item id="all" textValue="ทุกสถานะ">ทุกสถานะ<ListBox.ItemIndicator /></ListBox.Item><ListBox.Item id="active" textValue="ใช้งาน">ใช้งาน<ListBox.ItemIndicator /></ListBox.Item><ListBox.Item id="disabled" textValue="ถูกระงับ">ถูกระงับ<ListBox.ItemIndicator /></ListBox.Item>{adminsOnly && <ListBox.Item id="pending" textValue="รอเข้าสู่ระบบ">รอเข้าสู่ระบบ<ListBox.ItemIndicator /></ListBox.Item>}</ListBox></Select.Popover>
        </Select>
      </div>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="ตารางผู้ใช้ เลื่อนแนวนอนเพื่อดูข้อมูลทั้งหมด">
        <table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b border-border bg-surface-secondary/50 text-xs text-muted"><tr><th scope="col" className="px-6 py-4 font-semibold">ชื่อผู้ใช้</th>{adminsOnly && <th scope="col" className="px-4 py-4 font-semibold">ชื่อเข้าสู่ระบบ</th>}<th scope="col" className="px-4 py-4 font-semibold">อีเมล</th><th scope="col" className="px-4 py-4 font-semibold">เบอร์โทรศัพท์</th><th scope="col" className="px-4 py-4 font-semibold">สถานะ</th><th scope="col" className="px-4 py-4 font-semibold">เข้าสู่ระบบล่าสุด</th><th scope="col" className="px-4 py-4 text-center font-semibold">จัดการ</th></tr></thead>
          <tbody className="divide-y divide-border">{visible.map((row) => <tr key={row.id} className="transition-colors hover:bg-surface-secondary/40">
            <td className="px-6 py-4"><div className="flex items-center gap-3"><Avatar size="sm" className="shrink-0">{row.picture && <Avatar.Image src={row.picture} alt="" referrerPolicy="no-referrer" />}<Avatar.Fallback><UserIcon size={18} /></Avatar.Fallback></Avatar><span className="max-w-48 truncate font-medium" title={row.name}>{row.name}</span></div></td>
            {adminsOnly && <td className="px-4 py-4 font-mono text-xs text-muted">{data.credentials?.find((credential) => credential.email === row.email)?.username || "ยังไม่ได้ตั้งค่า"}</td>}
            <td className="px-4 py-4 text-muted">{row.email}</td><td className="whitespace-nowrap px-4 py-4 text-muted">{row.phone || "—"}</td>
            <td className="px-4 py-4"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${row.disabled ? "bg-danger-soft text-danger" : !row.account ? "bg-warning-soft text-warning" : "bg-success-soft text-success"}`}>{row.disabled ? "ถูกระงับ" : !row.account ? "รอเข้าสู่ระบบ" : "ใช้งาน"}</span></td>
            <td className="whitespace-nowrap px-4 py-4 text-xs text-muted">{row.account ? new Date(row.account.lastLogin).toLocaleDateString("th-TH") : "—"}</td>
            <td className="px-4 py-4 text-center"><button type="button" disabled={pending} aria-label={`แก้ไข ${row.email}`} onClick={() => { setEditing(row); setDialogError(""); }} className="inline-flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent-soft hover:text-accent focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"><EditIcon size={18} /></button></td>
          </tr>)}</tbody>
        </table>
        {visible.length === 0 && <div className="px-6 py-14 text-center"><UserIcon size={30} className="mx-auto text-muted" /><p className="mt-3 font-medium">ไม่พบผู้ใช้</p><p className="mt-1 text-sm text-muted">{query || status !== "all" ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" : "บัญชีจะแสดงที่นี่หลังเข้าสู่ระบบด้วย Google หรือเพิ่มอีเมลแอดมิน"}</p></div>}
      </div>
      <div className="border-t border-border px-6 py-4 text-xs text-muted" role="status">แสดง {visible.length} จาก {sectionRows.length} บัญชี</div>
    </section>
    <UserEditor key={editing?.id ?? "closed"} row={editing} username={data.credentials?.find((entry) => entry.email === editing?.email)?.username ?? ""} pending={pending} mutate={mutate} onCredentialsReady={setCredentialResult} onClose={() => setEditing(null)} />
    <Modal.Backdrop isOpen={adding} onOpenChange={(open) => { if (!open && !pending) setAdding(false); }}>
      <Modal.Container size="lg" placement="center" scroll="inside">
        <Modal.Dialog className="max-w-[512px] overflow-hidden rounded-2xl bg-overlay p-0 text-foreground shadow-2xl">
          <Modal.CloseTrigger isDisabled={pending} className="text-muted" />
          <Modal.Header className="border-b border-border px-6 py-5"><Modal.Heading className="text-lg font-semibold">เพิ่มแอดมิน</Modal.Heading></Modal.Header>
          <Modal.Body className="m-0 px-6 py-5 text-foreground">
            {dialogError && <p role="alert" className="mb-4 rounded-lg bg-danger-soft p-3 text-sm text-danger">{dialogError}</p>}
            <form id="add-directory-admin" onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              setDialogError("");
              const password = generateAccountPassword();
              const username = String(form.get("username")).toLowerCase();
              const email = String(form.get("email")).trim().toLowerCase();
              const name = `${String(form.get("firstName")).trim()} ${String(form.get("lastName")).trim()}`;
              const phone = String(form.get("phone")).trim();
              if (await mutate({ action: "addAdmin", email, username, password, name, phone, disabled: !newAccountActive })) {
                setAdding(false);
                setCredentialResult({ kind: "created", account: name, username, password });
              }
              else setDialogError("เพิ่มแอดมินไม่สำเร็จ กรุณาตรวจสอบอีเมล ชื่อผู้ใช้ หรือสถานะบัญชี");
            }}>
              <fieldset disabled={pending} className="space-y-4 disabled:opacity-70">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium">ชื่อ<input name="firstName" required maxLength={120} autoComplete="given-name" className={`${inputClass} mt-1.5 text-foreground disabled:bg-surface-secondary disabled:text-muted`} placeholder="ชื่อ" /></label>
                  <label className="block text-sm font-medium">นามสกุล<input name="lastName" required maxLength={120} autoComplete="family-name" className={`${inputClass} mt-1.5 text-foreground disabled:bg-surface-secondary disabled:text-muted`} placeholder="นามสกุล" /></label>
                </div>
                <label className="block text-sm font-medium">อีเมล<input name="email" type="email" required maxLength={191} className={`${inputClass} mt-1.5 text-foreground disabled:bg-surface-secondary disabled:text-muted`} placeholder="name@gmail.com" /></label>
                <label className="block text-sm font-medium">ชื่อผู้ใช้งาน (Username)<input name="username" required minLength={3} maxLength={64} pattern={"[a-zA-Z0-9][a-zA-Z0-9._\\-]{2,63}"} autoComplete="off" className={`${inputClass} mt-1.5 text-foreground disabled:bg-surface-secondary disabled:text-muted`} placeholder="เช่น mosfes3" /><span className="mt-1 block text-xs font-normal text-muted">อักษรอังกฤษ ตัวเลข จุด ขีดกลาง หรือขีดล่าง 3–64 ตัว</span></label>
                <label className="block text-sm font-medium">เบอร์โทรศัพท์<input name="phone" type="tel" maxLength={30} autoComplete="tel" className={`${inputClass} mt-1.5 text-foreground disabled:bg-surface-secondary disabled:text-muted`} placeholder="เบอร์โทรศัพท์" /></label>
                <Switch aria-label="เปิดใช้งานบัญชี" isSelected={newAccountActive} onChange={setNewAccountActive} isDisabled={pending} className="w-full rounded-xl border border-border bg-surface-secondary/50 p-4">
                  <Switch.Content className="w-full justify-between gap-4">
                    <span className="min-w-0"><Label className="text-sm font-semibold">เปิดใช้งานบัญชี</Label><span className="mt-1 block text-xs leading-relaxed text-muted">{newAccountActive ? "บัญชีนี้สามารถเข้าสู่ระบบได้" : "บัญชีนี้จะถูกระงับการเข้าสู่ระบบ"}</span></span>
                    <Switch.Control><Switch.Thumb /></Switch.Control>
                  </Switch.Content>
                </Switch>
              </fieldset>
            </form>
          </Modal.Body>
          <Modal.Footer className="mx-6 flex flex-wrap items-center justify-end gap-5 border-t border-border px-0 py-4">
            <button type="button" disabled={pending} onClick={() => setAdding(false)} className="text-sm font-medium text-muted">ยกเลิก</button>
            <button type="submit" form="add-directory-admin" disabled={pending} className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm hover:opacity-90 disabled:opacity-50">{pending ? "กำลังบันทึก…" : "เพิ่มแอดมิน"}</button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
    {credentialResult && <CredentialResultDialog result={credentialResult} onClose={() => { setCredentialResult(null); setEditing(null); onCredentialsClose?.(); }} />}
  </div>;
}

