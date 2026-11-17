"use client";

import { Button, Description, FieldError, Form, Input, Label, TextField } from "@heroui/react";
import { useState } from "react";
import { storeActions } from "@/lib/store";

export function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return <section className="mx-auto my-12 max-w-lg rounded-xl border border-border bg-surface p-6 sm:p-10">
    <h1 className="text-2xl font-semibold">ตั้งรหัสผ่านใหม่</h1>
    <p className="mt-3 text-sm leading-relaxed text-muted">บัญชีของคุณเพิ่งถูกสร้างหรือรีเซ็ตรหัสผ่าน กรุณาเปลี่ยนรหัสผ่านชั่วคราวเป็นรหัสผ่านของคุณก่อนเริ่มใช้งาน</p>
    {error && <p role="alert" className="mt-5 text-sm text-danger">{error}</p>}
    <Form method="post" className="mt-6 flex flex-col gap-5" onSubmit={async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      setPending(true); setError("");
      try {
        const response = await fetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: form.get("password"), confirm: form.get("confirm") }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        window.location.replace("/auth/complete");
      } catch (cause) { setError(cause instanceof Error ? cause.message : "เปลี่ยนรหัสผ่านไม่สำเร็จ"); }
      finally { setPending(false); }
    }}>
      <TextField name="password" type="password" isRequired minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={setPassword}>
        <Label>รหัสผ่านใหม่</Label><Input /><Description>12–128 ตัวอักษร และต้องต่างจากรหัสผ่านชั่วคราว</Description><FieldError />
      </TextField>
      <TextField name="confirm" type="password" isRequired minLength={12} maxLength={128} autoComplete="new-password" validate={(value) => value !== password ? "รหัสผ่านไม่ตรงกัน" : null}>
        <Label>ยืนยันรหัสผ่านใหม่</Label><Input /><FieldError />
      </TextField>
      <Button type="submit" fullWidth isPending={pending}>{pending ? "กำลังบันทึก…" : "บันทึกรหัสผ่านใหม่"}</Button>
      <Button type="button" variant="outline" isDisabled={pending} onPress={async () => {
        try { await storeActions.signOut(); window.location.replace("/login"); }
        catch { setError("ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง"); }
      }}>ออกจากระบบ</Button>
    </Form>
  </section>;
}
