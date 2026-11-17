"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Fit the A4 sheet to the viewport on screen; printing always uses its actual size. */
export function OrderPaper({ children }: { children: ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const update = () => setScale(Math.min(1, element.clientWidth / (210 * 96 / 25.4)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={container} className="w-full pb-2 print:pb-0">
    <div className="order-paper-scale mx-auto w-fit print:!w-auto" style={{ zoom: scale }}>
      {children}
    </div>
  </div>;
}
