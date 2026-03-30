"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

type DashboardActionVariant =
  | "navigation"
  | "standard"
  | "primary"
  | "light"
  | "pill";
type DashboardActionSize = "dense" | "md" | "lg";

type DashboardActionProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  icon?: ReactNode;
  variant?: DashboardActionVariant;
  active?: boolean;
  iconOnly?: boolean;
  size?: DashboardActionSize;
};

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export const DashboardAction = forwardRef<HTMLButtonElement, DashboardActionProps>(
  function DashboardAction(
    {
      children,
      className,
      icon,
      variant = "standard",
      active = false,
      iconOnly = false,
      size = "md",
      type = "button",
      ...props
    },
    ref,
  ) {
    const standardSize =
      size === "dense"
        ? "h-8 px-3 text-[0.82rem]"
        : size === "lg"
          ? "h-12 px-4 text-sm"
          : "h-10 px-3.5 text-sm";
    const primarySize =
      size === "dense"
        ? "h-8 px-3 text-[0.82rem]"
        : size === "lg"
          ? "h-12 px-5 text-base"
          : "h-10 px-4 text-sm";
    const pillSize =
      size === "md"
        ? "h-10 px-3 py-1.5 text-[0.8rem]"
        : "h-8 px-3 text-[0.76rem]";

    const classes = joinClasses(
      "inline-flex items-center transition",
      iconOnly && "justify-center px-0",
      variant === "navigation" &&
        "gap-2.5 px-3 py-[11px] text-(--muted-strong) hover:bg-white/4",
      variant === "navigation" && active && "bg-white/7 text-[var(--text)]",
      variant === "standard" &&
        joinClasses(
          "gap-2 bg-[var(--bg-input)] text-(--muted-strong) hover:bg-[#2a2b36]",
          standardSize,
          iconOnly &&
            (size === "dense" ? "w-8" : size === "lg" ? "w-12" : "w-10"),
        ),
      variant === "primary" &&
        joinClasses(
          "gap-3 bg-[#25262e] font-semibold text-[var(--text)] hover:bg-[#2a2b36]",
          primarySize,
          iconOnly &&
            (size === "dense" ? "w-8" : size === "lg" ? "w-12" : "w-10"),
        ),
      variant === "light" &&
        joinClasses(
          "gap-2 bg-[#d6d6d6] font-semibold text-[#111] hover:bg-[#9b9b9b]",
          standardSize,
          iconOnly &&
            (size === "dense" ? "w-8" : size === "lg" ? "w-12" : "w-10"),
        ),
      variant === "pill" &&
        joinClasses("gap-2 bg-transparent text-muted", pillSize),
      className,
    );

    return (
      <button className={classes} ref={ref} type={type} {...props}>
        {icon}
        {children}
      </button>
    );
  },
);
