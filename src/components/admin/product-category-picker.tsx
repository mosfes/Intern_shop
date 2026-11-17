"use client";

import { ComboBox, Input, Label, ListBox } from "@heroui/react";
import type { Category } from "@/lib/types";

type Props = {
  categories: Category[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  filter?: boolean;
};

export function ProductCategoryPicker({ categories, value, onChange, disabled, filter = false }: Props) {
  const options = [
    ...(filter ? [{ slug: "all", nameTh: "ทุกหมวดหมู่", name: "All categories" }] : []),
    ...categories,
  ];
  return <ComboBox
    name={filter ? undefined : "category"}
    aria-label={filter ? "กรองหมวดหมู่สินค้า" : undefined}
    value={value || null}
    onChange={(key) => onChange(key === null ? "" : String(key))}
    isRequired={!filter}
    isDisabled={disabled}
    defaultFilter={(text, query) => {
      const option = options.find((option) => option.nameTh === text);
      return `${text} ${option?.name ?? ""} ${option?.slug ?? ""}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
    }}
    className="w-full min-w-0"
  >
    {!filter && <Label className="text-sm font-medium">หมวดหมู่</Label>}
    <ComboBox.InputGroup className="min-h-10 rounded-lg"><Input placeholder="ค้นหาหรือเลือกหมวดหมู่" className="min-w-0" /><ComboBox.Trigger aria-label="เลือกหมวดหมู่" /></ComboBox.InputGroup>
    <ComboBox.Popover><ListBox renderEmptyState={() => <p className="p-3 text-sm text-muted">ไม่พบหมวดหมู่ ลองค้นหาด้วยชื่ออื่น</p>}>{options.map((category) => <ListBox.Item key={category.slug} id={category.slug} textValue={category.nameTh}>{category.nameTh}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></ComboBox.Popover>
  </ComboBox>;
}
