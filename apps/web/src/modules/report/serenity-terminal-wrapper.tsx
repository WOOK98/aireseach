"use client";

/* oxlint-disable i18next/no-literal-string */

import dynamic from "next/dynamic";

const SerenityTerminal = dynamic(
  () =>
    import("~/modules/report/serenity-terminal").then(
      (mod) => mod.SerenityTerminal,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[600px] items-center justify-center rounded-lg border border-[#e0dbd2] bg-[#faf9f6]">
        <div className="text-center">
          <div className="mb-2 font-mono text-2xl text-[#9a9690]/20">▮</div>
          <p className="font-mono text-sm text-[#9a9690]">
            Loading Terminal...
          </p>
        </div>
      </div>
    ),
  },
);

export function SerenityTerminalWrapper() {
  return <SerenityTerminal />;
}
