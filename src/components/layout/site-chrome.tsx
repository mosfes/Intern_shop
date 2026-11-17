"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function SiteChrome({ children, header, footer }: { children: ReactNode; header: ReactNode; footer: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  return <>
    {!isAdmin && header}
    <main id="main" className="flex-1">{children}</main>
    {!isAdmin && footer}
  </>;
}
