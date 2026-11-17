"use client";

import { RouterProvider, Toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { FeedbackProvider } from "@/components/feedback-provider";
import { CatalogProvider } from "@/components/catalog-provider";
import { QuickViewProvider } from "@/components/product/quick-view";
import { GoogleSessionSync } from "@/components/account/google-session-sync";
import type { CatalogData } from "@/lib/catalog";

declare module "react-aria-components" {
  interface RouterConfig {
    routerOptions: NonNullable<Parameters<ReturnType<typeof useRouter>["push"]>[1]>;
  }
}

export function Providers({ catalog, children }: { catalog: CatalogData; children: ReactNode }) {
  const router = useRouter();
  return (
    <RouterProvider navigate={router.push}>
      <GoogleSessionSync />
      <CatalogProvider data={catalog}>
        <FeedbackProvider><QuickViewProvider>{children}</QuickViewProvider></FeedbackProvider>
      </CatalogProvider>
      <Toast.Provider placement="bottom end" />
    </RouterProvider>
  );
}

/** Inline script — applies the saved theme before first paint (prevents a light/dark flash). */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('heroui-theme')||'system';var r=t==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;var d=document.documentElement;d.classList.add(r);d.setAttribute('data-theme',r);}catch(e){}})();`;
