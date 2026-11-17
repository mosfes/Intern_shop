// User-Agent is reported by the client and is only an approximate device description.
export function adminDevice(userAgent: string | null) {
  if (!userAgent) return null;
  const browser = /Edg(?:e|A|iOS)?\//.test(userAgent) ? "Edge" : /OPR\//.test(userAgent) ? "Opera" : /(?:Firefox|FxiOS)\//.test(userAgent) ? "Firefox" : /(?:Chrome|CriOS)\//.test(userAgent) ? "Chrome" : /Safari\//.test(userAgent) ? "Safari" : "เบราว์เซอร์อื่น";
  const os = /iPhone|iPad|iPod/.test(userAgent) ? "iOS / iPadOS" : /Android/.test(userAgent) ? "Android" : /Windows/.test(userAgent) ? "Windows" : /Macintosh|Mac OS X/.test(userAgent) ? "macOS" : /Linux/.test(userAgent) ? "Linux" : "ไม่ทราบระบบ";
  const device = /iPad|Tablet|Android(?!.*Mobile)/.test(userAgent) ? "แท็บเล็ต" : /Mobi|iPhone|iPod/.test(userAgent) ? "มือถือ" : "คอมพิวเตอร์ / อื่น ๆ";
  return `${browser} · ${os} · ${device}`;
}
