/* oxlint-disable i18next/no-literal-string */

import { notFound } from "next/navigation";

import { getMetadata } from "~/lib/metadata";
import { DashboardReportWrapper } from "~/modules/report/dashboard-report-wrapper";

export const dynamic = "force-dynamic";

export const generateMetadata = getMetadata({
  title: "marketing:report.title",
  description: "marketing:report.description",
});

export default function PreviewReportPage() {
  if (process.env.VERCEL_ENV !== "preview") {
    notFound();
  }

  return <DashboardReportWrapper />;
}
