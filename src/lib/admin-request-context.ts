import { isIP } from "node:net";

type ProxySource = "vercel" | "cloudflare" | "proxy" | "none";
function clean(value: string | null, limit: number) {
  return value?.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, limit) || null;
}
function decoded(value: string | null) {
  if (!value) return null;
  try { return clean(decodeURIComponent(value), 120); } catch { return clean(value, 120); }
}

// Only trust headers from an explicitly configured, origin-protecting proxy.
export function adminRequestContext(headers: Headers) {
  const configured = process.env.ADMIN_LOG_PROXY;
  const source: ProxySource = configured === "vercel" || configured === "cloudflare" || configured === "proxy" ? configured : !configured && process.env.VERCEL === "1" ? "vercel" : "none";
  const rawIp = source === "vercel" ? headers.get("x-vercel-forwarded-for") : source === "cloudflare" ? headers.get("cf-connecting-ip") : source === "proxy" ? headers.get("x-real-ip") : null;
  const ip = rawIp?.trim();
  const country = source === "vercel" ? headers.get("x-vercel-ip-country") : source === "cloudflare" ? headers.get("cf-ipcountry") : null;
  const region = source === "vercel" ? headers.get("x-vercel-ip-country-region") : source === "cloudflare" ? headers.get("cf-region") : null;
  const city = source === "vercel" ? headers.get("x-vercel-ip-city") : source === "cloudflare" ? headers.get("cf-ipcity") : null;
  return {
    ipAddress: ip && isIP(ip) ? ip : null,
    userAgent: clean(headers.get("user-agent"), 1000),
    country: country && /^[A-Za-z]{2}$/.test(country) && !["XX", "T1"].includes(country.toUpperCase()) ? country.toUpperCase() : null,
    region: decoded(region), city: decoded(city),
    contextSource: source === "none" ? null : source,
  };
}
