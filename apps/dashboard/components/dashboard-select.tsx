"use client";

import { CaretDown, Check } from "@phosphor-icons/react";
import * as Select from "@radix-ui/react-select";
import { useState } from "react";

type Option = {
  label: string;
  value: string;
};

export function DashboardSelect({
  defaultValue,
  value,
  onValueChange,
  options,
  name,
}: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  options: Option[];
  name?: string;
}) {
  const fallbackValue = defaultValue ?? options[0]?.value ?? "";
  const [internalValue, setInternalValue] = useState(fallbackValue);
  const selectedValue = value ?? internalValue;

  function handleValueChange(nextValue: string) {
    if (value === undefined) {
      setInternalValue(nextValue);
    }

    onValueChange?.(nextValue);
  }

  return (
    <>
      {name ? <input name={name} type="hidden" value={selectedValue} /> : null}
      <Select.Root onValueChange={handleValueChange} value={selectedValue}>
      <Select.Trigger
        className="inline-flex h-10 min-w-[124px] items-center justify-between gap-3 rounded-[10px] border border-[var(--line)] bg-[var(--bg-input)] px-3.5 text-sm text-[var(--text)] outline-none transition hover:border-[var(--line-strong)] hover:bg-[#222]"
        aria-label="Select option"
      >
        <Select.Value />
        <Select.Icon>
          <CaretDown size={14} weight="bold" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="z-[70] w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[10px] border border-[var(--line-strong)] bg-[var(--bg-panel-soft)] shadow-[0_20px_40px_rgba(0,0,0,0.38)]"
          position="popper"
        >
          <Select.Viewport className="p-1.5">
            {options.map((option) => (
              <Select.Item
                className="relative flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--muted-strong)] outline-none data-[highlighted]:bg-white/6"
                key={option.value}
                value={option.value}
              >
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator className="inline-flex items-center">
                  <Check size={14} weight="bold" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
      </Select.Root>
    </>
  );
}
