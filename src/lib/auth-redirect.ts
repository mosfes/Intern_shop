/**
 * Remembers where a signed-out shopper was heading so login can send them back.
 * Only a fixed allow-list of internal paths is ever stored or followed (no open redirects).
 */
const STORAGE_KEY = "edm-post-login-path";
const ALLOWED_PATHS = new Set(["/checkout"]);

/** Where to send a signed-out shopper who tries to check out. */
export const CHECKOUT_LOGIN_HREF = `/login?next=${encodeURIComponent("/checkout")}`;

export function safeNextPath(value: unknown): string | null {
  return typeof value === "string" && ALLOWED_PATHS.has(value) ? value : null;
}

/** Pass `null` to forget any remembered destination. */
export function rememberPostLoginPath(path: string | null) {
  try {
    if (path) window.sessionStorage.setItem(STORAGE_KEY, path);
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable — login simply lands on the default page */
  }
}

/** Reads and clears the remembered destination. */
export function takePostLoginPath(): string | null {
  try {
    const path = safeNextPath(window.sessionStorage.getItem(STORAGE_KEY));
    window.sessionStorage.removeItem(STORAGE_KEY);
    return path;
  } catch {
    return null;
  }
}
