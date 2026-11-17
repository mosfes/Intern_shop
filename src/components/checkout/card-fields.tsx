"use client";

import Script from "next/script";
import { useState } from "react";

declare global {
  interface Window {
    Omise?: {
      setPublicKey: (key: string) => void;
      createToken: (type: "card", params: Record<string, string>, callback: (status: number, response: { id?: string; message?: string }) => void) => void;
    };
  }
}


const field = "mt-1.5 min-h-10 w-full rounded-lg border border-[var(--field-border)] bg-[var(--field-background)] px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:opacity-50";

/** Card details are read from these inputs and sent straight to Omise; they have no `name`, so they never reach our server. */
export function CardFields({ publicKey, disabled }: { publicKey: string; disabled: boolean }) {
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <Script src="https://cdn.omise.co/omise.js" strategy="afterInteractive" onReady={() => window.Omise?.setPublicKey(publicKey)} />
      <label className="block text-sm font-medium sm:col-span-2">หมายเลขบัตร
        <input id="card-number" required disabled={disabled} inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000" maxLength={23} pattern="[0-9 ]{12,23}" value={number}
          onChange={(event) => setNumber(event.target.value.replace(/[^\d]/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim())} className={field} />
      </label>
      <label className="block text-sm font-medium sm:col-span-2">ชื่อบนบัตร
        <input id="card-name" required disabled={disabled} autoComplete="cc-name" placeholder="SOMCHAI JAIDEE" maxLength={100} className={field} />
      </label>
      <label className="block text-sm font-medium">วันหมดอายุ (เดือน/ปี)
        <input id="card-expiry" required disabled={disabled} inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" maxLength={5} pattern="(0[1-9]|1[0-2])/\d{2}" value={expiry}
          onChange={(event) => { const digits = event.target.value.replace(/\D/g, "").slice(0, 4); setExpiry(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits); }} className={field} />
      </label>
      <label className="block text-sm font-medium">รหัส CVV
        <input id="card-cvc" required disabled={disabled} inputMode="numeric" autoComplete="cc-csc" placeholder="123" maxLength={4} pattern="\d{3,4}" type="password" className={field} />
      </label>
    </div>
  );
}

/** Turns the card inputs into a single-use Omise token. Rejects with a customer-facing message. */
export function createCardToken(publicKey: string): Promise<string> {
  const value = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value.trim() ?? "";
  const [month, year] = value("card-expiry").split("/");
  return new Promise((resolve, reject) => {
    if (!window.Omise) return reject(new Error("ระบบรับบัตรยังโหลดไม่เสร็จ กรุณารอสักครู่แล้วลองอีกครั้ง"));
    window.Omise.setPublicKey(publicKey);
    window.Omise.createToken("card", {
      name: value("card-name"),
      number: value("card-number").replace(/\s/g, ""),
      expiration_month: String(Number(month)),
      expiration_year: `20${year}`,
      security_code: value("card-cvc"),
    }, (status, response) => {
      if (status === 200 && response.id) resolve(response.id);
      else reject(new Error("ข้อมูลบัตรไม่ถูกต้องหรือบัตรใช้ไม่ได้ กรุณาตรวจสอบอีกครั้ง"));
    });
  });
}
