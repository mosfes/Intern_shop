"use client";

import { Autocomplete, FieldError, Label, ListBox, SearchField } from "@heroui/react";
import { useState } from "react";
import provinces from "@/data/thai-addresses.json";

function AddressSelect({
  name,
  label,
  placeholder,
  value,
  options,
  onChange,
  isDisabled = false,
}: {
  name: string;
  label: string;
  placeholder: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  isDisabled?: boolean;
}) {
  return (
    <Autocomplete
      name={name}
      isRequired
      isDisabled={isDisabled}
      value={value || null}
      onChange={(key) => onChange(key === null ? "" : String(key))}
      placeholder={placeholder}
      fullWidth
    >
      <Label>{label}</Label>
      <Autocomplete.Trigger>
        <Autocomplete.Value />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover>
        <Autocomplete.Filter filter={(text, query) => text.includes(query.trim())}>
          <SearchField aria-label={`ค้นหา${label}`} autoFocus>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder={`พิมพ์ค้นหา${label}...`} />
              <SearchField.ClearButton aria-label="ล้างคำค้นหา" />
            </SearchField.Group>
          </SearchField>
          <ListBox renderEmptyState={() => <p className="px-3 py-4 text-center text-sm text-muted">ไม่พบข้อมูลที่ค้นหา</p>}>
            {options.map((option) => (
              <ListBox.Item key={option} id={option} textValue={option}>
                {option}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
      <FieldError>กรุณาเลือก{label}</FieldError>
    </Autocomplete>
  );
}

export function ShippingAddressFields({ defaults }: { defaults?: { province: string; district: string; subdistrict?: string; postcode: string } }) {
  const [province, setProvince] = useState(defaults?.province ?? "กรุงเทพมหานคร");
  const [district, setDistrict] = useState(defaults?.district ?? "");
  const [subdistrict, setSubdistrict] = useState(defaults?.subdistrict ?? "");
  const [postcode, setPostcode] = useState(defaults?.postcode ?? "");
  const districts = provinces.find((item) => item.name === province)?.districts ?? [];
  const subdistricts = districts.find((item) => item.name === district)?.subdistricts ?? [];
  const selectedSubdistrict = subdistricts.find((item) => item.name === subdistrict);
  const postcodes = selectedSubdistrict ? [selectedSubdistrict.postcode] : [];

  return (
    <>
      <AddressSelect
        name="province"
        label="จังหวัด"
        placeholder="เลือกจังหวัด"
        value={province}
        options={provinces.map((item) => item.name).sort((a, b) => a.localeCompare(b, "th"))}
        onChange={(value) => {
          setProvince(value);
          setDistrict("");
          setSubdistrict("");
          setPostcode("");
        }}
      />
      <AddressSelect
        name="district"
        label="เขต / อำเภอ"
        placeholder="เลือกเขต / อำเภอ"
        value={district}
        options={districts.map((item) => item.name).sort((a, b) => a.localeCompare(b, "th"))}
        isDisabled={!province}
        onChange={(value) => {
          setDistrict(value);
          setSubdistrict("");
          setPostcode("");
        }}
      />
      <AddressSelect
        name="subdistrict"
        label="แขวง / ตำบล"
        placeholder={district ? "เลือกแขวง / ตำบล" : "เลือกเขต / อำเภอก่อน"}
        value={subdistrict}
        options={subdistricts.map((item) => item.name).sort((a, b) => a.localeCompare(b, "th"))}
        isDisabled={!district}
        onChange={(value) => {
          setSubdistrict(value);
          setPostcode(subdistricts.find((item) => item.name === value)?.postcode ?? "");
        }}
      />
      <AddressSelect
        name="postcode"
        label="รหัสไปรษณีย์"
        placeholder={subdistrict ? "เลือกรหัสไปรษณีย์" : "เลือกแขวง / ตำบลก่อน"}
        value={postcode}
        options={postcodes}
        isDisabled={!subdistrict}
        onChange={setPostcode}
      />
    </>
  );
}
