"use client";

import { Label, ListBox, Select } from "@heroui/react";

type Props = {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  name?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  showLabel?: boolean;
};

export function ProductSelect({ label, options, value, onChange, name, placeholder, required, disabled, showLabel }: Props) {
  return <Select
    aria-label={showLabel ? undefined : label}
    name={name}
    value={value || null}
    onChange={(key) => onChange(key === null ? "" : String(key))}
    placeholder={placeholder}
    isRequired={required}
    isDisabled={disabled}
    className="w-full min-w-0"
  >
    {showLabel && <Label className="text-sm font-medium">{label}</Label>}
    <Select.Trigger className="min-h-10 w-full rounded-lg"><Select.Value /><Select.Indicator /></Select.Trigger>
    <Select.Popover><ListBox>{options.map((option) => <ListBox.Item key={option.value} id={option.value} textValue={option.label}>{option.label}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover>
  </Select>;
}
