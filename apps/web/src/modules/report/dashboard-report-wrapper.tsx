"use client";

/* oxlint-disable i18next/no-literal-string */

import dynamic from "next/dynamic";

const DashboardReport = dynamic(
  () =>
    import("~/modules/report/dashboard-report").then(
      (mod) => mod.DashboardReport,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[600px] items-center justify-center bg-[#faf8f3]">
        <div className="text-center">
          <div className="mb-2 font-mono text-2xl text-[#9a9690]/20">▮</div>
          <p className="font-mono text-sm text-[#9a9690]">Loading...</p>
        </div>
      </div>
    ),
  },
);

export function DashboardReportWrapper() {
  return <DashboardReport />;
}
