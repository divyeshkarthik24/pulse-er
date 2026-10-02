import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[var(--color-emerald)] text-white hover:brightness-110 shadow-[var(--shadow-soft)] border border-transparent",
  secondary:
    "bg-[var(--color-surface-raised)] text-[var(--color-ink)] border border-[var(--color-line)] hover:border-[var(--color-ink-mute)]",
  outline:
    "bg-transparent text-[var(--color-ink)] border border-[var(--color-line)] hover:bg-[var(--color-paper-dim)]",
  ghost: "bg-transparent text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-dim)] border border-transparent",
  danger: "bg-[var(--color-coral)] text-white hover:brightness-110 border border-transparent",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-xs px-3 py-1.5 gap-1.5 rounded-lg",
  md: "text-sm px-4 py-2 gap-2 rounded-xl",
  lg: "text-base px-5 py-2.5 gap-2 rounded-xl",
};

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  iconRight,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 whitespace-nowrap",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled}
      {...rest}
    >
      {icon}
      {children}
      {iconRight}
    </button>
  );
}
