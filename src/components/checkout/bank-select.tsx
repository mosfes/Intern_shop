"use client";

import { Label, ListBox, Select } from "@heroui/react";
import Image from "next/image";
import { MOBILE_BANKS } from "@/lib/payments";

type MobileBank = (typeof MOBILE_BANKS)[number];

const bankColors: Record<MobileBank["id"], string> = {
  mobile_banking_kbank: "#138f2d",
  mobile_banking_scb: "#4e2e7f",
  mobile_banking_bay: "#fec43b",
  mobile_banking_bbl: "#1e4598",
  mobile_banking_ktb: "#1ba5e1",
};

function BankLogo({ bank }: { bank: MobileBank }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-8 shrink-0 place-items-center rounded-lg"
      style={{ backgroundColor: bankColors[bank.id] }}
    >
      <Image src={`/banks/${bank.id.replace("mobile_banking_", "")}.svg`} alt="" width={24} height={24} className="size-6 object-contain" />
    </span>
  );
}

export function BankSelect({ value, onChange, isDisabled }: {
  value: MobileBank["id"];
  onChange: (value: MobileBank["id"]) => void;
  isDisabled: boolean;
}) {
  const selectedBank = MOBILE_BANKS.find((bank) => bank.id === value)!;

  return (
    <Select
      name="bank"
      value={value}
      onChange={(key) => {
        const bank = MOBILE_BANKS.find((option) => option.id === key);
        if (bank) onChange(bank.id);
      }}
      isDisabled={isDisabled}
      isRequired
      fullWidth
      className="mt-4"
    >
      <Label>เลือกแอปธนาคาร</Label>
      <Select.Trigger className="min-h-12 rounded-lg">
        <Select.Value className="flex min-w-0 items-center gap-3">
          <BankLogo bank={selectedBank} />
          <span className="truncate">{selectedBank.label}</span>
        </Select.Value>
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {MOBILE_BANKS.map((bank) => (
            <ListBox.Item key={bank.id} id={bank.id} textValue={bank.label} className="gap-3 py-2">
              <BankLogo bank={bank} />
              <span className="min-w-0 flex-1">{bank.label}</span>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
