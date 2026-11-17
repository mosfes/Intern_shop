"use client";

import {
  Button,
  Checkbox,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
  buttonVariants,
  toast,
} from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { EyeIcon, GoogleIcon } from "@/components/icons";
import { rememberPostLoginPath } from "@/lib/auth-redirect";
import { REGISTRATION_OPEN } from "@/lib/registration";
import "./auth-showcase.css";

function ShopShowcase() {
  return (
    <aside aria-label="อุปกรณ์คอมพิวเตอร์จาก EDM PC Shop" className="edm-auth-showcase">
      <Image
        src="/images/promotions/auth-clean-shadow-lossless.webp"
        alt="ภาพประกอบคอมเกมมิ่งเคสกระจก ประกอบด้วยการ์ดจอ MSI ชุดน้ำ NZXT แรม Kingston และเมนบอร์ด ASUS พร้อมกล่อง AMD Ryzen 7, MSI RTX 5070 Ti และ ROG ในโทนส้มและขาว"
        fill
        unoptimized
        loading="eager"
        sizes="(min-width: 1152px) 552px, (min-width: 1024px) 50vw, 100vw"
        className="edm-auth-artwork"
      />
    </aside>
  );
}

function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="grid overflow-hidden rounded-xl border border-border bg-surface lg:grid-cols-2">
        <section className="px-6 py-8 sm:px-12 sm:py-12 lg:px-14">
          <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 text-sm text-muted">{footer}</p>
        </section>
        <ShopShowcase />
      </div>
    </div>
  );
}

function GoogleButton({ label }: { label: string }) {
  return (
    <a href="/api/auth/google" className={`${buttonVariants({ variant: "outline", size: "lg" })} w-full gap-3 font-medium`}>
      <GoogleIcon size={18} />
      {label}
    </a>
  );
}

function OrDivider({ children }: { children: ReactNode }) {
  return (
    <div className="my-6 flex items-center gap-4 text-xs text-muted" role="separator">
      <span className="h-px flex-1 bg-border" />
      {children}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export function LoginForm({ googleError, next, registered }: { googleError?: string; next?: string; registered?: boolean }) {
  const router = useRouter();
  // Google sign-in leaves the site, so keep the destination in this tab for /auth/complete.
  useEffect(() => rememberPostLoginPath(next ?? null), [next]);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [loginError, setLoginError] = useState("");
  return (
    <AuthShell
      title="เข้าสู่ระบบ"
      subtitle="ยินดีต้อนรับกลับสู่ EDM PC Shop"
      footer={
        REGISTRATION_OPEN ? (
          <>
            ยังไม่มีบัญชี?{" "}
            <Link href="/register" className="font-medium text-accent hover:underline">
              สมัครสมาชิก
            </Link>
          </>
        ) : (
          "ขณะนี้ปิดรับสมัครสมาชิกชั่วคราว ลูกค้าสามารถเข้าสู่ระบบด้วยอีเมลได้"
        )
      }
    >
      {registered && <p role="status" className="mb-4 rounded-lg bg-accent-soft/60 px-3 py-2 text-sm">ยืนยันอีเมลและสมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ</p>}
      {next && !googleError && (
        <p role="status" className="mb-4 rounded-lg bg-accent-soft/60 px-3 py-2 text-sm">
          {next === "/orders" ? "กรุณาเข้าสู่ระบบเพื่อดูและติดตามคำสั่งซื้อของคุณ" : "กรุณาเข้าสู่ระบบก่อนสั่งซื้อ สินค้าในตะกร้าของคุณจะยังอยู่ครบ"}
        </p>
      )}
      {googleError && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {googleError === "google_configuration"
            ? "ยังไม่พร้อมให้เข้าสู่ระบบด้วย Google กรุณาลองใหม่ภายหลัง"
            : "เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองอีกครั้ง"}
        </p>
      )}
      <GoogleButton label="เข้าสู่ระบบด้วย Google" />
      <p className="mt-3 text-center text-xs text-muted">ลูกค้าเข้าสู่ระบบด้วยอีเมล Google ได้ทันที โดยไม่ต้องสมัครสมาชิก</p>
      <OrDivider>เข้าสู่ระบบด้วยอีเมล</OrDivider>
      {loginError && <p role="alert" className="mb-4 text-sm text-danger">{loginError}</p>}
      <Form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          setPending(true); setLoginError("");
          try {
            const response = await fetch("/api/auth/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: String(form.get("identifier")).trim(), password: form.get("password"), remember: form.has("remember") }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            router.replace(result.mustChangePassword ? "/change-password" : "/auth/complete");
          } catch (error) { setLoginError(error instanceof Error ? error.message : "เข้าสู่ระบบไม่สำเร็จ"); }
          finally { setPending(false); }
        }}
      >
        <TextField name="identifier" type="text" isRequired autoComplete="username" validate={(value) => value.trim() ? null : "กรุณากรอกอีเมล"}>
          <Label>อีเมล</Label>
          <Input placeholder="อีเมล" />
          <FieldError>กรุณากรอกอีเมล</FieldError>
        </TextField>
        <TextField name="password" type={showPassword ? "text" : "password"} isRequired maxLength={128} autoComplete="current-password">
          <div className="flex items-center justify-between">
            <Label>รหัสผ่าน</Label>
            <button type="button" className="text-xs text-accent hover:underline" onClick={() => toast("กรุณาติดต่อผู้ดูแลร้านหากต้องการความช่วยเหลือเรื่องรหัสผ่าน")}>
              ลืมรหัสผ่าน?
            </button>
          </div>
          <div className="edm-auth-password">
            <Input
              placeholder="รหัสผ่าน"
              onKeyDown={(event) => setCapsLock(event.getModifierState("CapsLock"))}
              onKeyUp={(event) => setCapsLock(event.getModifierState("CapsLock"))}
              onBlur={() => setCapsLock(false)}
              aria-describedby={capsLock ? "login-caps-lock" : undefined}
            />
            <button type="button" className="edm-auth-password-toggle" aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>
              <EyeIcon size={18} />
              {showPassword && <span className="edm-auth-eye-slash" />}
            </button>
          </div>
          {capsLock && <Description id="login-caps-lock" className="text-accent" role="status">เปิด Caps Lock อยู่</Description>}
          <FieldError>กรุณากรอกรหัสผ่าน</FieldError>
        </TextField>
        <Checkbox name="remember" defaultSelected>
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Label className="text-sm font-normal">จดจำการเข้าสู่ระบบ</Label>
          </Checkbox.Content>
        </Checkbox>
        <Button type="submit" size="lg" fullWidth isPending={pending}>
          {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
        </Button>
      </Form>
    </AuthShell>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <AuthShell
      title="สมัครสมาชิก"
      subtitle="สร้างบัญชีเพื่อรับสิทธิพิเศษสำหรับสมาชิก"
      footer={
        <>
          มีบัญชีอยู่แล้ว?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            เข้าสู่ระบบ
          </Link>
        </>
      }
    >
      {error && <p role="alert" className="mb-4 text-sm text-danger">{error}</p>}
      {email ? <Form className="flex flex-col gap-4" onSubmit={async (e) => {
        e.preventDefault(); setPending(true); setError("");
        try {
          const response = await fetch("/api/auth/verify-registration", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code: String(new FormData(e.currentTarget).get("code")) }) });
          const result = await response.json(); if (!response.ok) throw new Error(result.error);
          router.push("/login?registered=1");
        } catch (error) { setError(error instanceof Error ? error.message : "ยืนยันไม่สำเร็จ"); } finally { setPending(false); }
      }}>
        <p className="text-sm">ส่งรหัส 6 หลักไปที่ {email} รหัสมีอายุ 10 นาที</p>
        <TextField name="code" isRequired autoComplete="one-time-code"><Label>รหัสยืนยัน OTP</Label><Input inputMode="numeric" maxLength={6} /><FieldError>กรุณากรอกรหัสยืนยัน</FieldError></TextField>
        <Button type="submit" size="lg" fullWidth isPending={pending}>ยืนยันและสมัครสมาชิก</Button>
        <button type="button" className="text-sm text-accent" onClick={() => { setEmail(""); setError(""); }}>กลับไปขอรหัสใหม่</button>
      </Form> : <Form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault(); const d = new FormData(e.currentTarget); setPending(true); setError("");
          try {
            const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: d.get("name"), email: d.get("email"), phone: d.get("phone"), password: d.get("password") }) });
            const result = await response.json(); if (!response.ok) throw new Error(result.error);
            setEmail(String(d.get("email")).trim().toLowerCase());
          } catch (error) { setError(error instanceof Error ? error.message : "สมัครไม่สำเร็จ"); } finally { setPending(false); }
        }}
      >
        <TextField name="name" isRequired autoComplete="name">
          <Label>ชื่อ-นามสกุล</Label>
          <Input placeholder="สมชาย ใจดี" />
          <FieldError>กรุณากรอกชื่อ</FieldError>
        </TextField>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="email" type="email" isRequired autoComplete="email">
            <Label>อีเมล</Label>
            <Input placeholder="you@email.com" />
            <FieldError>อีเมลไม่ถูกต้อง</FieldError>
          </TextField>
          <TextField name="phone" type="tel" autoComplete="tel">
            <Label>เบอร์โทรศัพท์</Label>
            <Input placeholder="08x-xxx-xxxx" />
          </TextField>
        </div>
        <TextField name="password" type="password" isRequired minLength={12} maxLength={128} value={password} onChange={setPassword} autoComplete="new-password">
          <Label>รหัสผ่าน</Label>
          <Input />
          <Description>อย่างน้อย 12 ตัวอักษร</Description>
          <FieldError>รหัสผ่านอย่างน้อย 12 ตัวอักษร</FieldError>
        </TextField>
        <TextField
          name="confirm"
          type="password"
          isRequired
          autoComplete="new-password"
          validate={(v) => (v && v !== password ? "รหัสผ่านไม่ตรงกัน" : null)}
        >
          <Label>ยืนยันรหัสผ่าน</Label>
          <Input />
          <FieldError />
        </TextField>
        <Checkbox name="terms" isRequired>
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Label className="text-sm font-normal">ยอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัว</Label>
          </Checkbox.Content>
        </Checkbox>
        <Button type="submit" size="lg" fullWidth isPending={pending}>
          ส่งรหัสยืนยัน
        </Button>
      </Form>}
    </AuthShell>
  );
}
