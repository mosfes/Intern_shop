"use client";

import { Button, Card, Checkbox, Chip, FieldError, Form, Input, Label, Skeleton, TextArea, TextField, toast } from "@heroui/react";
import { useState } from "react";
import { ShippingAddressFields } from "@/components/checkout/shipping-address-fields";
import { MapPinIcon, PlusIcon, TrashIcon, EditIcon } from "@/components/icons";
import { useAddressBook, type AddressResult } from "@/lib/address-book";
import { formatAddressLine, MAX_ADDRESSES, type AddressInput, type SavedAddress } from "@/lib/addresses";

const emptyDraft = (user: { name: string; phone?: string }): AddressInput => ({
  label: "",
  fullName: user.name,
  phone: user.phone ?? "",
  address: "",
  province: "",
  district: "",
  subdistrict: "",
  postcode: "",
});

function AddressForm({
  initial,
  canSetDefault,
  isFirst,
  onSubmit,
  onCancel,
}: {
  initial: AddressInput & { isDefault?: boolean };
  canSetDefault: boolean;
  isFirst: boolean;
  onSubmit: (input: AddressInput, isDefault: boolean) => Promise<AddressResult>;
  onCancel: () => void;
}) {
  const [isDefault, setIsDefault] = useState(initial.isDefault === true || isFirst);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  return (
    <Form method="post"
      className="grid gap-4 rounded-xl border border-border bg-surface-secondary/50 p-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
        setSaving(true);
        setError("");
        const result = await onSubmit(
          { label: d.label ?? "", fullName: d.fullName, phone: d.phone, address: d.address, province: d.province, district: d.district, subdistrict: d.subdistrict, postcode: d.postcode },
          isDefault,
        );
        setSaving(false);
        if (!result.ok) setError(result.message);
      }}
    >
      <TextField name="label" defaultValue={initial.label} maxLength={60} className="sm:col-span-2">
        <Label>ชื่อเรียกที่อยู่ (ไม่บังคับ)</Label>
        <Input placeholder="เช่น บ้าน, ที่ทำงาน" />
      </TextField>
      <TextField name="fullName" isRequired defaultValue={initial.fullName} autoComplete="name">
        <Label>ชื่อผู้รับ</Label>
        <Input placeholder="สมชาย ใจดี" />
        <FieldError>กรุณากรอกชื่อผู้รับ</FieldError>
      </TextField>
      <TextField name="phone" type="tel" isRequired defaultValue={initial.phone} autoComplete="tel" pattern="[0-9\- ]{9,12}">
        <Label>เบอร์โทรศัพท์</Label>
        <Input placeholder="08x-xxx-xxxx" />
        <FieldError>กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง</FieldError>
      </TextField>
      <TextField name="address" isRequired defaultValue={initial.address} maxLength={500} className="sm:col-span-2" autoComplete="street-address">
        <Label>ที่อยู่</Label>
        <TextArea placeholder="บ้านเลขที่ อาคาร ถนน" rows={2} />
        <FieldError>กรุณากรอกที่อยู่</FieldError>
      </TextField>
      <ShippingAddressFields defaults={initial.province ? { province: initial.province, district: initial.district, subdistrict: initial.subdistrict, postcode: initial.postcode } : undefined} />
      {canSetDefault && (
        <Checkbox isSelected={isDefault} onChange={setIsDefault} isDisabled={isFirst || initial.isDefault === true} className="sm:col-span-2">
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Content>
            <Label>ตั้งเป็นที่อยู่เริ่มต้น</Label>
          </Checkbox.Content>
        </Checkbox>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger sm:col-span-2">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3 sm:col-span-2">
        <Button type="button" variant="secondary" onPress={onCancel} isDisabled={saving}>
          ยกเลิก
        </Button>
        <Button type="submit" isPending={saving}>
          บันทึกที่อยู่
        </Button>
      </div>
    </Form>
  );
}

/** "ที่อยู่จัดส่งของฉัน" — lets a customer keep several addresses and reuse them on later orders. */
export function AddressBook({ user, className }: { user: { googleId?: string; name: string; phone?: string }; className?: string }) {
  const book = useAddressBook(user.googleId ?? null);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const list = book.addresses;

  const act = async (id: string, work: () => Promise<AddressResult>, success: string) => {
    setBusy(id);
    const result = await work();
    setBusy(null);
    if (result.ok) toast(success);
    else toast.danger(result.message);
  };

  const save = async (id: string | "new", input: AddressInput, isDefault: boolean) => {
    const result = id === "new" ? await book.add(input, isDefault) : await book.update(id, input, isDefault);
    if (result.ok) {
      setEditing(null);
      toast(id === "new" ? "เพิ่มที่อยู่แล้ว" : "บันทึกที่อยู่แล้ว");
    }
    return result;
  };

  return (
    <Card className={`border border-border p-6 ${className ?? ""}`}>
      <Card.Header className="mb-4 flex-row items-start justify-between gap-3 p-0">
        <div>
          <Card.Title>ที่อยู่จัดส่งของฉัน</Card.Title>
          <Card.Description>บันทึกไว้ครั้งเดียว เลือกใช้ได้ทุกครั้งที่สั่งซื้อ (สูงสุด {MAX_ADDRESSES} ที่อยู่)</Card.Description>
        </div>
        {list && list.length < MAX_ADDRESSES && editing === null && (
          <Button size="sm" variant="secondary" onPress={() => setEditing("new")}>
            <PlusIcon size={16} /> เพิ่มที่อยู่
          </Button>
        )}
      </Card.Header>

      {list === null ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : (
        <div className="space-y-3">
          {book.failed && <p role="alert" className="text-sm text-danger">โหลดที่อยู่ไม่สำเร็จ กรุณารีเฟรชหน้านี้</p>}
          {list.length === 0 && editing !== "new" && !book.failed && (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-4 py-8 text-center">
              <span className="mb-3 grid size-12 place-items-center rounded-lg bg-accent-soft text-accent">
                <MapPinIcon size={22} />
              </span>
              <p className="font-medium">ยังไม่มีที่อยู่ที่บันทึกไว้</p>
              <p className="mt-1 text-sm text-muted">เพิ่มที่อยู่เพื่อไม่ต้องกรอกใหม่ทุกครั้งที่สั่งซื้อ</p>
              <Button className="mt-4" onPress={() => setEditing("new")}>
                <PlusIcon size={16} /> เพิ่มที่อยู่แรก
              </Button>
            </div>
          )}
          {editing === "new" && (
            <AddressForm
              initial={emptyDraft(user)}
              canSetDefault
              isFirst={list.length === 0}
              onSubmit={(input, isDefault) => save("new", input, isDefault)}
              onCancel={() => setEditing(null)}
            />
          )}
          {list.map((a: SavedAddress) =>
            editing === a.id ? (
              <AddressForm
                key={a.id}
                initial={a}
                canSetDefault
                isFirst={false}
                onSubmit={(input, isDefault) => save(a.id, input, isDefault)}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <div key={a.id} className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 text-sm">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{a.label || a.fullName}</span>
                    {a.isDefault && (
                      <Chip color="accent" variant="soft" size="sm">
                        ค่าเริ่มต้น
                      </Chip>
                    )}
                  </div>
                  <p>
                    {a.label && <>{a.fullName} · </>}
                    {a.phone}
                  </p>
                  <p className="mt-0.5 text-muted">{formatAddressLine(a)}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {!a.isDefault && (
                    <Button size="sm" variant="ghost" isDisabled={busy !== null} onPress={() => act(a.id, () => book.makeDefault(a.id), "ตั้งเป็นที่อยู่เริ่มต้นแล้ว")}>
                      ตั้งเป็นค่าเริ่มต้น
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" isDisabled={busy !== null} onPress={() => setEditing(a.id)}>
                    <EditIcon size={15} /> แก้ไข
                  </Button>
                  <Button
                    size="sm"
                    variant="danger-soft"
                    aria-label={`ลบที่อยู่ ${a.label || a.fullName}`}
                    isPending={busy === a.id}
                    isDisabled={busy !== null}
                    onPress={() => {
                      if (window.confirm("ลบที่อยู่นี้ใช่หรือไม่?")) void act(a.id, () => book.remove(a.id), "ลบที่อยู่แล้ว");
                    }}
                  >
                    <TrashIcon size={15} />
                  </Button>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </Card>
  );
}
