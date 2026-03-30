import type { ReactNode } from "react";

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

type DashboardPageHeaderProps = {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
};

export function DashboardPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: DashboardPageHeaderProps) {
  const hasLead = Boolean(eyebrow || title || description);

  return (
    <header className="border-b border-(--line) bg-[rgba(16,18,23,0.92)] backdrop-blur-md lg:sticky lg:top-0 lg:z-20">
      <div
        className={joinClasses(
          "flex flex-wrap gap-4 px-5 py-5",
          hasLead ? "items-center justify-between" : "items-center justify-end",
        )}
      >
        {hasLead ? (
          <div className="grid gap-1">
            {eyebrow ? (
              <span className="text-[0.76rem] uppercase tracking-[0.14em] text-muted">
                {eyebrow}
              </span>
            ) : null}
            {title ? (
              <h1 className="text-[1.45rem] font-medium leading-none tracking-[-0.04em] text-(--text)">
                {title}
              </h1>
            ) : null}
            {description ? (
              <div className="text-[0.84rem] text-muted">{description}</div>
            ) : null}
          </div>
        ) : null}
        {actions ? (
          <div className="flex flex-wrap items-center justify-end gap-3">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
