"use client";

import { useEffect } from "react";
import { storeActions } from "@/lib/store";

export function GoogleSessionSync() {
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/session", { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then(({ user }) => {
        if (controller.signal.aborted) return;
        if (user?.mustChangePassword) {
          storeActions.syncGoogleUser(null);
          if (window.location.pathname !== "/change-password") window.location.replace("/change-password");
          return;
        }
        storeActions.syncGoogleUser(user);
      })
      .catch(() => { /* Retain the current display during temporary network failures. */ });
    // Pick up cart changes made on another device (and retry any unsaved ones) when the tab is shown again.
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void storeActions.refreshOrders().then(() => storeActions.refreshCart());
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      controller.abort();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return null;
}
