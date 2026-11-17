"use client";

import { useEffect } from "react";
import { takePostLoginPath } from "@/lib/auth-redirect";
import { storeActions } from "@/lib/store";

export default function GoogleLoginComplete() {
  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then(({ user }) => {
        if (!active) return;
        if (!user) { window.location.replace("/login?error=google_login"); return; }
        if (user.mustChangePassword) { window.location.replace("/change-password"); return; }
        storeActions.signIn(user);
        const next = takePostLoginPath();
        window.location.replace(user.role === "admin" ? "/admin" : next ?? "/");
      })
      .catch(() => { if (active) window.location.replace("/login?error=google_login"); });
    return () => { active = false; };
  }, []);
  return <p role="status" className="px-6 py-16 text-center text-muted">กำลังเข้าสู่ระบบ…</p>;
}
