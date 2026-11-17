"use client";

export function discardDraftImages(draftId: string, urls?: string[]) {
  return fetch("/api/admin/products/images/cleanup", {
    method: "POST", keepalive: true, headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ draftId, ...(urls ? { urls } : {}) }),
  }).catch(() => undefined);
}
