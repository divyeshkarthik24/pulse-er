import type { HTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  children: ReactNode;
}

const paddings = { none: "", sm: "p-3", md: "p-5", lg: "p-7" };

export function Card({ glass, padding = "md", className, children, ...rest }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl border",
        glass ? "glass-panel shadow-[var(--shadow-glass)]" : "bg-[var(--color-surface)] border-[var(--color-line)] shadow-[var(--shadow-soft)]",
        paddings[padding],
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  icon,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        {eyebrow && (
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-emerald)] mb-1.5">
            {eyebrow}
          </div>
        )}
        <h2 className="font-display text-xl md:text-2xl text-[var(--color-ink)] flex items-center gap-2">
          {icon}
          {title}
        </h2>
        {description && <p className="text-sm text-[var(--color-ink-soft)] mt-1 max-w-xl">{description}</p>}
      </div>
      {action}
    </div>
  );
}
