import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export function validUsername(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{2,63}$/.test(value);
}

export function validPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 12 && value.length <= 128;
}

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key)));
}

export async function hashPassword(password: string) {
  if (!validPassword(password)) throw new Error("Password must contain 12–128 characters");
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${(await derive(password, salt)).toString("hex")}`;
}

export async function verifyPassword(password: string, encoded?: string) {
  const parts = encoded?.split("$");
  const valid = parts?.length === 3 && parts[0] === "scrypt" && /^[a-f0-9]{32}$/.test(parts[1]) && /^[a-f0-9]{128}$/.test(parts[2]);
  // Unknown usernames perform the same expensive derivation as valid usernames.
  const actual = await derive(password, valid ? parts[1] : "0".repeat(32));
  const expected = Buffer.from(valid ? parts[2] : "0".repeat(128), "hex");
  return timingSafeEqual(actual, expected) && !!valid;
}
