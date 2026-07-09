/* oxlint-disable i18next/no-literal-string */

import { getMetadata } from "~/lib/metadata";
import { DashboardReportWrapper } from "~/modules/report/dashboard-report-wrapper";

export const generateMetadata = getMetadata({
  title: "marketing:report.title",
  description: "marketing:report.description",
});

export default function ReportPage() {
  return (
    <div className="flex-1">
      <DashboardReportWrapper />
    </div>
  );
}
