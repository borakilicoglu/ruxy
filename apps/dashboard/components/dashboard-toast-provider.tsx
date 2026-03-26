"use client";

import {
  Toast,
  ToastCloseButton,
  ToastContent,
  ToastDescription,
  ToastIndicator,
  ToastProvider,
  ToastTitle,
} from "@heroui/react/toast";
import {
  CheckCircle,
  Info,
  SpinnerGap,
  Warning,
  XCircle,
} from "@phosphor-icons/react";

function variantClasses(variant?: "default" | "accent" | "success" | "warning" | "danger") {
  switch (variant) {
    case "success":
      return {
        shell: "border-[rgba(67,176,73,0.32)] bg-[#111411]",
        stripe: "bg-[#43b049]",
        icon: "text-[#7ed784]",
      };
    case "danger":
      return {
        shell: "border-[rgba(208,86,86,0.32)] bg-[#151010]",
        stripe: "bg-[#d05656]",
        icon: "text-[#ef8c8c]",
      };
    case "warning":
      return {
        shell: "border-[rgba(208,162,50,0.32)] bg-[#15130f]",
        stripe: "bg-[#d0a232]",
        icon: "text-[#e3bf64]",
      };
    case "accent":
      return {
        shell: "border-[rgba(90,121,255,0.28)] bg-[#101218]",
        stripe: "bg-[#5a79ff]",
        icon: "text-[#8ea3ff]",
      };
    default:
      return {
        shell: "border-white/10 bg-[var(--bg-panel)]",
        stripe: "bg-[var(--muted)]",
        icon: "text-[var(--muted-strong)]",
      };
  }
}

function variantIcon(
  variant?: "default" | "accent" | "success" | "warning" | "danger",
  isLoading?: boolean,
) {
  if (isLoading) {
    return <SpinnerGap className="animate-spin" size={16} weight="bold" />;
  }

  switch (variant) {
    case "success":
      return <CheckCircle size={16} weight="fill" />;
    case "danger":
      return <XCircle size={16} weight="fill" />;
    case "warning":
      return <Warning size={16} weight="fill" />;
    case "accent":
      return <Info size={16} weight="fill" />;
    default:
      return <Info size={16} weight="fill" />;
  }
}

export function DashboardToastProvider() {
  return (
    <ToastProvider
      className="z-[120]"
      maxVisibleToasts={4}
      placement="bottom"
      width={380}
    >
      {(renderProps) => {
        const content = renderProps.toast.content ?? {};
        const variant = content.variant;
        const classes = variantClasses(variant);

        return (
          <Toast
            className={`overflow-hidden rounded-[14px] border shadow-[0_18px_42px_rgba(0,0,0,0.46)] backdrop-blur-sm ${classes.shell}`}
            placement="bottom"
            toast={renderProps.toast}
            variant={variant}
          >
            <div className={`w-[3px] self-stretch ${classes.stripe}`} />
            <ToastIndicator
              className={`mt-[1px] flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-white/8 bg-white/[0.04] ${classes.icon}`}
              variant={variant}
            >
              {variantIcon(variant, content.isLoading)}
            </ToastIndicator>
            <ToastContent className="min-w-0 gap-1 py-[2px]">
              <ToastTitle
                className="truncate text-[0.82rem] font-medium tracking-[0.01em] text-[var(--text)]"
                style={{ fontFamily: "var(--font-mono), monospace" }}
              >
                {content.title}
              </ToastTitle>
              {content.description ? (
                <ToastDescription
                  className="text-[0.75rem] leading-5 text-[var(--muted)]"
                  style={{ fontFamily: "var(--font-mono), monospace" }}
                >
                  {content.description}
                </ToastDescription>
              ) : null}
            </ToastContent>
            <ToastCloseButton
              className="rounded-[10px] border border-transparent bg-transparent text-[var(--muted)] transition hover:border-white/8 hover:bg-white/[0.04] hover:text-[var(--text)]"
            />
          </Toast>
        );
      }}
    </ToastProvider>
  );
}
