"use client";

import { PrinterIcon } from "@/components/icons";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
      <PrinterIcon size={16} />พิมพ์ / บันทึกเป็น PDF
    </button>
  );
}
