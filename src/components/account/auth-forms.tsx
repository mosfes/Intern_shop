"use client";

import {
  Button,
  Card,
  Checkbox,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  Separator,
  TextField,
  toast,
} from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { CheckIcon, Logo } from "@/components/icons";
import { scenePhotos } from "@/data/photos";
import { storeActions } from "@/lib/store";

function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:py-16">
      <div className="relative hidden overflow-hidden rounded-xl bg-neutral-950 p-10 text-white lg:flex lg:flex-col">
        <Image src={scenePhotos.setup} alt="" fill sizes="(min-width: 1024px) 480px, 1px" className="bg-white object-contain p-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-neutral-950/30" />
        <Logo className="relative !text-white" />
        <h2 className="relative mt-auto text-3xl font-semibold leading-tight">เข้าสู่ระบบเพื่อติดตาม<br />คำสั่งซื้อและรายการโปรด</h2>
        <ul className="relative mt-6 space-y-3 text-sm text-white/80">
          {["ติดตามคำสั่งซื้อได้ทุกขั้นตอน", "บันทึกรายการโปรดข้ามอุปกรณ์", "รับโค้ดส่วนลดสมาชิกก่อนใคร"].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <CheckIcon size={16} className="text-orange-400" /> {t}
            </li>
          ))}
        </ul>
      </div>
      <Card className="border border-border p-6 sm:p-10">
        <Card.Header className="mb-6 p-0">
          <Card.Title className="text-2xl font-semibold tracking-tight">{title}</Card.Title>
          <Card.Description>{subtitle}</Card.Description>
        </Card.Header>
        <Card.Content className="p-0">{children}</Card.Content>
        <Card.Footer className="mt-6 justify-center p-0 text-sm text-muted">{footer}</Card.Footer>
      </Card>
    </div>
  );
}

const demoNote = (
  <p className="rounded-xl bg-warning-soft px-3 py-2 text-xs text-warning-soft-foreground">
    โหมดสาธิต: ไม่มีเซิร์ฟเวอร์ยืนยันตัวตน ข้อมูลจะถูกเก็บไว้ในเบราว์เซอร์ของคุณเท่านั้น และไม่ตรวจสอบรหัสผ่าน
  </p>
);

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <AuthShell
      title="เข้าสู่ระบบ"
      subtitle="ยินดีต้อนรับกลับสู่ EDM PC Shop"
      footer={
        <span>
          ยังไม่มีบัญชี?{" "}
          <Link href="/register" className="font-medium text-accent hover:underline">
            สมัครสมาชิก
          </Link>
        </span>
      }
    >
      <Form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const email = String(new FormData(e.currentTarget).get("email"));
          setPending(true);
          window.setTimeout(() => {
            const name = email.split("@")[0];
            storeActions.signIn({ name: name.charAt(0).toUpperCase() + name.slice(1), email });
            toast.success("เข้าสู่ระบบสำเร็จ (เดโม)");
            router.push("/profile");
          }, 500);
        }}
      >
        {demoNote}
        <TextField name="email" type="email" isRequired autoComplete="email">
          <Label>อีเมล</Label>
          <Input placeholder="you@email.com" />
          <FieldError>กรุณากรอกอีเมลให้ถูกต้อง</FieldError>
        </TextField>
        <TextField name="password" type="password" isRequired minLength={6} autoComplete="current-password">
          <div className="flex items-center justify-between">
            <Label>รหัสผ่าน</Label>
            <button type="button" className="text-xs text-accent hover:underline" onClick={() => toast("ฟีเจอร์ลืมรหัสผ่านเป็นตัวอย่าง UI เท่านั้น")}>
              ลืมรหัสผ่าน?
            </button>
          </div>
          <Input placeholder="อย่างน้อย 6 ตัวอักษร" />
          <FieldError>รหัสผ่านอย่างน้อย 6 ตัวอักษร</FieldError>
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
          เข้าสู่ระบบ
        </Button>
        <div className="flex items-center gap-3 text-xs text-muted">
          <Separator className="flex-1" /> หรือ <Separator className="flex-1" />
        </div>
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onPress={() => {
            storeActions.signIn({ name: "ผู้ใช้ทดลอง", email: "guest@edmpcshop.example" });
            toast.success("เข้าสู่ระบบด้วยบัญชีทดลองแล้ว");
            router.push("/profile");
          }}
        >
          ทดลองใช้งานด้วยบัญชีตัวอย่าง
        </Button>
      </Form>
    </AuthShell>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  return (
    <AuthShell
      title="สมัครสมาชิก"
      subtitle="สร้างบัญชีเพื่อรับสิทธิพิเศษสำหรับสมาชิก"
      footer={
        <span>
          มีบัญชีอยู่แล้ว?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            เข้าสู่ระบบ
          </Link>
        </span>
      }
    >
      <Form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          storeActions.signIn({ name: String(d.get("name")), email: String(d.get("email")), phone: String(d.get("phone") ?? "") });
          toast.success("สมัครสมาชิกสำเร็จ (เดโม)", { description: "ยินดีต้อนรับสู่ EDM PC Shop" });
          router.push("/profile");
        }}
      >
        {demoNote}
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
        <TextField name="password" type="password" isRequired minLength={8} value={password} onChange={setPassword} autoComplete="new-password">
          <Label>รหัสผ่าน</Label>
          <Input />
          <Description>อย่างน้อย 8 ตัวอักษร</Description>
          <FieldError>รหัสผ่านอย่างน้อย 8 ตัวอักษร</FieldError>
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
        <Button type="submit" size="lg" fullWidth>
          สร้างบัญชี
        </Button>
      </Form>
    </AuthShell>
  );
}
