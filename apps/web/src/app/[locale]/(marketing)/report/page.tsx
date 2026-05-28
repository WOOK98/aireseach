import { getTranslation } from "@workspace/i18n/server";

import { getMetadata } from "~/lib/metadata";
import { ReportGenerator } from "~/modules/report/report-generator";

export const generateMetadata = getMetadata({
  title: "marketing:report.title",
  description: "marketing:report.description",
});

interface ReportPageProps {
  readonly searchParams: Promise<{
    target?: string;
  }>;
}

export default async function ReportPage({ searchParams }: ReportPageProps) {
  const { t } = await getTranslation({ ns: "marketing" });
  const { target } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">
          {t("report.title")}
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          {t("report.description")}
        </p>
      </div>
      <ReportGenerator initialTarget={target ?? ""} />
    </div>
  );
}
