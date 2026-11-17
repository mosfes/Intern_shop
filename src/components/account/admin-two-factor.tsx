"use client";

import { Button, Card, Chip, Description, FieldError, Form, Input, Label, TextField, toast } from "@heroui/react";
import { useState } from "react";
import { CheckCircleIcon, QrIcon, ShieldIcon } from "@/components/icons";

type Step = "off" | "setup" | "on";

/**
 * Two-factor authentication card for admin accounts (profile page).
 *
 * UI only for now: nothing is sent to or stored on a server, the QR code / setup key are placeholders and the
 * state resets on reload. When the backend exists, replace the three `TODO(2fa)` spots below with real calls
 * (start enrolment → returns secret + otpauth URI, verify code, disable with a fresh code).
 */
export function AdminTwoFactor({ className = "" }: { className?: string }) {
  const [step, setStep] = useState<Step>("off");
  const [pending, setPending] = useState(false);

  async function startSetup() {
    // TODO(2fa): request a new TOTP secret + otpauth:// URI from the server and render it as a real QR code.
    setStep("setup");
  }

  async function verify() {
    setPending(true);
    try {
      // TODO(2fa): POST the 6-digit code (read it from the form's `code` field) and only continue when it is accepted.
      await new Promise((resolve) => window.setTimeout(resolve, 500));
      setStep("on");
      toast.success("เปิดใช้งานการยืนยันตัวตนสองขั้นตอนแล้ว");
    } finally {
      setPending(false);
    }
  }

  async function disable() {
    // TODO(2fa): require a current code (or backup code) and turn 2FA off on the server.
    setStep("off");
    toast("ปิดการยืนยันตัวตนสองขั้นตอนแล้ว");
  }

  return (
    <Card className={`border border-border p-6 ${className}`}>
      <Card.Header className="mb-4 gap-3 p-0">
        <Card.Title className="flex items-center gap-2">
          <ShieldIcon size={20} className="text-accent" /> ยืนยันตัวตนสองขั้นตอน (2FA)
        </Card.Title>
        <div className="flex flex-wrap gap-1.5">
          <Chip size="sm" variant="soft" color={step === "on" ? "success" : "default"}>
            {step === "on" ? "เปิดใช้งาน" : "ยังไม่เปิดใช้งาน"}
          </Chip>
        </div>
        <Card.Description>เพิ่มความปลอดภัยให้บัญชีแอดมินด้วยรหัส 6 หลักจากแอปยืนยันตัวตน</Card.Description>
      </Card.Header>

      {step === "off" && (
        <div className="flex flex-col gap-4 rounded-xl bg-surface-secondary p-4">
          <p className="text-sm text-muted">
            เมื่อเปิดใช้งาน ระบบจะขอรหัสจากแอป เช่น Google Authenticator หรือ Authy ทุกครั้งที่เข้าสู่ระบบแอดมิน
          </p>
          <Button fullWidth onPress={startSetup}>เปิดใช้งาน 2FA</Button>
        </div>
      )}

      {step === "setup" && (
        <div className="flex flex-col gap-5">
          <div className="mx-auto w-44 space-y-2">
            <div
              role="img"
              aria-label="พื้นที่แสดง QR code สำหรับตั้งค่า 2FA"
              className="grid aspect-square place-items-center rounded-xl border border-dashed border-border bg-surface-secondary text-muted"
            >
              <QrIcon size={72} />
            </div>
            <p className="text-center text-xs text-muted">QR code จะแสดงที่นี่</p>
          </div>
          <div className="flex flex-col gap-5">
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted">
              <li>เปิดแอปยืนยันตัวตนบนมือถือของคุณ</li>
              <li>สแกน QR code หรือกรอกรหัสตั้งค่าด้วยตนเอง</li>
              <li>กรอกรหัส 6 หลักที่แอปแสดง เพื่อยืนยัน</li>
            </ol>
            <div>
              <p className="text-sm font-medium">รหัสตั้งค่า (กรอกเอง)</p>
              <p className="mt-1 rounded-lg bg-surface-secondary px-3 py-2 font-mono text-sm tracking-widest text-muted" aria-label="รหัสตั้งค่าจะแสดงที่นี่">
                •••• •••• •••• ••••
              </p>
            </div>
            <Form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                void verify();
              }}
            >
              <TextField
                name="code"
                isRequired
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                validate={(value) => (/^\d{6}$/.test(value) ? null : "กรุณากรอกรหัส 6 หลัก (ตัวเลขเท่านั้น)")}
                className="w-full"
              >
                <Label>รหัสยืนยัน 6 หลัก</Label>
                <Input placeholder="123456" className="font-mono tracking-[0.4em]" />
                <Description>รหัสจะเปลี่ยนทุก 30 วินาที</Description>
                <FieldError />
              </TextField>
              <div className="flex flex-wrap gap-3">
                <Button type="submit" isPending={pending}>{pending ? "กำลังตรวจสอบ…" : "ยืนยันและเปิดใช้งาน"}</Button>
                <Button type="button" variant="secondary" isDisabled={pending} onPress={() => setStep("off")}>ยกเลิก</Button>
              </div>
            </Form>
          </div>
        </div>
      )}

      {step === "on" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 rounded-xl bg-success/10 p-4 text-sm">
            <CheckCircleIcon size={20} className="mt-0.5 shrink-0 text-success" />
            <p>บัญชีนี้ได้รับการป้องกันด้วย 2FA แล้ว ระบบจะขอรหัสจากแอปยืนยันตัวตนทุกครั้งที่เข้าสู่ระบบแอดมิน</p>
          </div>
          <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
            <div>
              <p className="text-sm font-medium">รหัสสำรอง (Backup codes)</p>
              <p className="text-sm text-muted">ใช้เข้าสู่ระบบเมื่อไม่สามารถเข้าถึงแอปยืนยันตัวตน</p>
            </div>
            <Button variant="secondary" fullWidth onPress={() => toast("ระบบสร้างรหัสสำรองยังไม่เปิดใช้งาน")}>
              สร้างรหัสสำรอง
            </Button>
          </div>
          <div>
            <Button variant="danger-soft" fullWidth onPress={disable}>ปิดการใช้งาน 2FA</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
