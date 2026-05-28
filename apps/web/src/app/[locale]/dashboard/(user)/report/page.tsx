import { getTranslation } from "@workspace/i18n/server";

import { getMetadata } from "~/lib/metadata";
import { ReportGenerator } from "~/modules/report/report-generator";

export const generateMetadata = getMetadata({
  title: "marketing:report.title",
  description: "marketing:report.description",
});

export default async function ReportPage() {
  const { t } = await getTranslation({ ns: "marketing" });

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">
          {t("report.title")}
        </h2>
      </div>
      <ReportGenerator />
    </div>
  );
}
