"use client";

import type { InputHTMLAttributes } from "react";

type DashboardInputProps = InputHTMLAttributes<HTMLInputElement>;

export function DashboardInput({
  className = "",
  ...props
}: DashboardInputProps) {
  return (
    <input
      className={[
        "h-10 w-full border border-(--line) bg-(--bg-input) px-3.25 text-(--text) outline-none transition",
        "placeholder:text-muted hover:border-(--line-strong) focus:border-(--line-strong)",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
