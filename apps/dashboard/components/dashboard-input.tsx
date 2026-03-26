"use client";

import type { InputHTMLAttributes } from "react";

type DashboardInputProps = InputHTMLAttributes<HTMLInputElement>;

export function DashboardInput({ className = "", ...props }: DashboardInputProps) {
  return (
    <input
      className={[
        "h-10 w-full rounded-[10px] border border-[var(--line)] bg-[var(--bg-input)] px-[13px] text-[var(--text)] outline-none transition",
        "placeholder:text-[var(--muted)] hover:border-[var(--line-strong)] focus:border-[var(--line-strong)]",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
