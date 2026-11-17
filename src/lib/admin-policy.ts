export type UserRole = "admin" | "customer";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 191 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
