"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function SiteChrome({ children, header, footer }: { children: ReactNode; header: ReactNode; footer: ReactNode }) {
  const pathname = usePathname();
  // Admin pages and printable order documents bring their own layout.
  const bare = pathname === "/admin" || pathname.startsWith("/admin/") || /^\/orders\/[^/]+\/document$/.test(pathname);
  return <>
    {!bare && header}
    <main id="main" className="flex-1">{children}</main>
    {!bare && footer}
  </>;
}
