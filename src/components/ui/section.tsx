import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon } from "@/components/icons";

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 ${className ?? ""}`}>{children}</div>;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  href,
  linkLabel = "ดูทั้งหมด",
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
      <div className="max-w-2xl">
        {eyebrow && <p className="mb-1.5 text-sm font-medium text-accent">{eyebrow}</p>}
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
        {description && <p className="mt-1.5 text-sm text-muted sm:text-base">{description}</p>}
      </div>
      {action}
      {href && (
        <Link
          href={href}
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-foreground"
        >
          {linkLabel}
          <ArrowRightIcon size={16} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="mb-8">
      {children}
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      {description && <p className="mt-2 text-muted">{description}</p>}
    </div>
  );
}
