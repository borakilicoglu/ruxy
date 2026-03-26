"use client";

import { Check } from "@phosphor-icons/react";
import * as Checkbox from "@radix-ui/react-checkbox";

export function DashboardCheckbox({
  checked = false,
  onCheckedChange,
}: {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <Checkbox.Root
      checked={checked}
      onCheckedChange={(nextChecked) => onCheckedChange?.(nextChecked === true)}
      className="inline-flex h-4 w-4 items-center justify-center rounded-[5px] border border-[var(--line-strong)] bg-transparent text-[var(--text)] outline-none transition hover:border-white/35 data-[state=checked]:bg-white/10"
    >
      <Checkbox.Indicator className="inline-flex items-center justify-center">
        <Check size={11} weight="bold" />
      </Checkbox.Indicator>
    </Checkbox.Root>
  );
}
