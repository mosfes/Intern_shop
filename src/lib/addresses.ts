import provinces from "@/data/thai-addresses.json";

/** Most addresses one customer can keep. */
export const MAX_ADDRESSES = 10;

export interface AddressInput {
  label: string;
  fullName: string;
  phone: string;
  address: string;
  province: string;
  district: string;
  subdistrict: string;
  postcode: string;
}

export interface SavedAddress extends AddressInput {
  id: string;
  isDefault: boolean;
}

export class AddressError extends Error {}

const text = (value: unknown, max: number, field: string, required = true) => {
  if (value === undefined || value === null) value = "";
  if (typeof value !== "string") throw new AddressError(field);
  const trimmed = value.trim();
  if ((required && !trimmed) || trimmed.length > max) throw new AddressError(field);
  return trimmed;
};

/** Checks a request body and returns clean values; throws AddressError naming the bad field. */
export function validateAddress(body: unknown): AddressInput {
  if (!body || typeof body !== "object") throw new AddressError("body");
  const b = body as Record<string, unknown>;
  const province = text(b.province, 100, "province");
  const district = text(b.district, 100, "district");
  const postcode = text(b.postcode, 10, "postcode");
  const area = provinces.find((p) => p.name === province)?.districts.find((d) => d.name === district);
  if (!area) throw new AddressError("district");
  const subdistrict = text(b.subdistrict, 100, "subdistrict");
  const locality = area.subdistricts.find((item) => item.name === subdistrict);
  if (!locality) throw new AddressError("subdistrict");
  if (locality.postcode !== postcode) throw new AddressError("postcode");
  const phone = text(b.phone, 30, "phone");
  if (!/^[0-9\- ]{9,12}$/.test(phone)) throw new AddressError("phone");
  return {
    label: text(b.label, 60, "label", false),
    fullName: text(b.fullName, 255, "fullName"),
    phone,
    address: text(b.address, 500, "address"),
    province,
    district,
    subdistrict,
    postcode,
  };
}

export const formatAddressLine = (a: Pick<AddressInput, "address" | "subdistrict" | "district" | "province" | "postcode">) =>
  `${a.address} ${a.subdistrict ? `${a.subdistrict} ` : ""}${a.district} ${a.province} ${a.postcode}`;

/** Default first, then oldest first (the order the API returns them in). */
export function sortAddresses<T extends { isDefault: boolean }>(list: T[]): T[] {
  return [...list].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}
