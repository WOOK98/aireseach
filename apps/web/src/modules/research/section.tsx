/* oxlint-disable i18next/no-literal-string */

import { memo } from "react";

import type { ElementType, ReactNode } from "react";

export const Section = memo(function Section({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: ElementType;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="text-muted-foreground h-3.5 w-3.5" />
        <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
          {label}
        </span>
        <div className="bg-border h-px flex-1" />
      </div>
      {children}
    </div>
  );
});
