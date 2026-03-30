"use client";

import {
  Toast,
  ToastCloseButton,
  ToastContent,
  ToastDescription,
  ToastProvider,
  ToastTitle,
} from "@heroui/react/toast";

function variantClasses(variant?: "default" | "accent" | "success" | "warning" | "danger") {
  switch (variant) {
    case "success":
      return {
        shell: "border-[rgba(67,176,73,0.32)] bg-[#111411]",
        stripe: "bg-[#43b049]",
      };
    case "danger":
      return {
        shell: "border-[rgba(208,86,86,0.32)] bg-[#151010]",
        stripe: "bg-[#d05656]",
      };
    case "warning":
      return {
        shell: "border-[rgba(208,162,50,0.32)] bg-[#15130f]",
        stripe: "bg-[#d0a232]",
      };
    case "accent":
      return {
        shell: "border-[rgba(90,121,255,0.28)] bg-[#101218]",
        stripe: "bg-[#5a79ff]",
      };
    default:
      return {
        shell: "border-white/10 bg-(--bg-panel)",
        stripe: "bg-[var(--muted)]",
      };
  }
}

export function DashboardToastProvider() {
  return (
    <ToastProvider
      className="z-[120]"
      maxVisibleToasts={4}
      placement="top end"
      width={380}
    >
      {(renderProps) => {
        const content = renderProps.toast.content ?? {};
        const variant = content.variant;
        const classes = variantClasses(variant);

        return (
          <Toast
            className={`border px-3 py-2.5 shadow-[0_18px_42px_rgba(0,0,0,0.46)] backdrop-blur-sm ${classes.shell}`}
            placement="top end"
            toast={renderProps.toast}
            variant={variant}
          >
            <div className={`mr-3 w-[3px] self-stretch ${classes.stripe}`} />
            <ToastContent className="min-w-0 gap-1 py-[2px]">
              <ToastTitle
                className="truncate text-[0.82rem] font-medium tracking-[0.01em] text-[var(--text)]"
                style={{ fontFamily: "var(--font-mono), monospace" }}
              >
                {content.title}
              </ToastTitle>
              {content.description ? (
                <ToastDescription
                  className="text-[0.75rem] leading-5 text-muted"
                  style={{ fontFamily: "var(--font-mono), monospace" }}
                >
                  {content.description}
                </ToastDescription>
              ) : null}
            </ToastContent>
            <ToastCloseButton
              className="border border-transparent bg-transparent text-muted transition hover:border-(--line) hover:bg-[#2a2b36] hover:text-[var(--text)]"
            />
          </Toast>
        );
      }}
    </ToastProvider>
  );
}
