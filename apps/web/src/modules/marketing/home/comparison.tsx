import { getTranslation } from "@workspace/i18n/server";
import { Icons } from "@workspace/ui-web/icons";

import {
  Section,
  SectionBadge,
  SectionDescription,
  SectionHeader,
  SectionTitle,
} from "~/modules/marketing/layout/section";

const features = [
  {
    key: "reports",
    free: "comparison.table.value.reports.free",
    pro: "comparison.table.value.reports.pro",
    business: "comparison.table.value.reports.business",
  },
  {
    key: "jinaSearch",
    free: "comparison.table.value.jinaSearch.free",
    pro: "comparison.table.value.jinaSearch.pro",
    business: "comparison.table.value.jinaSearch.business",
  },
  {
    key: "modelKey",
    free: "comparison.table.value.modelKey.free",
    pro: "comparison.table.value.modelKey.pro",
    business: "comparison.table.value.modelKey.business",
  },
  {
    key: "analysisLenses",
    free: "comparison.table.value.analysisLenses.free",
    pro: "comparison.table.value.analysisLenses.pro",
    business: "comparison.table.value.analysisLenses.business",
  },
  {
    key: "reportHistory",
    free: false,
    pro: true,
    business: true,
  },
  {
    key: "markdownExport",
    free: true,
    pro: true,
    business: true,
  },
  {
    key: "teamWorkspace",
    free: false,
    pro: false,
    business: true,
  },
  {
    key: "sharedLibrary",
    free: false,
    pro: false,
    business: true,
  },
  {
    key: "apiAccess",
    free: false,
    pro: false,
    business: true,
  },
  {
    key: "customTemplates",
    free: false,
    pro: false,
    business: true,
  },
  {
    key: "brandedPdf",
    free: false,
    pro: false,
    business: true,
  },
  {
    key: "support",
    free: "comparison.table.value.support.free",
    pro: "comparison.table.value.support.pro",
    business: "comparison.table.value.support.business",
  },
] as const;

function CellValue({ value }: { value: boolean | string }) {
  if (value === true) {
    return (
      <div className="flex justify-center">
        <Icons.Check className="text-primary size-5" />
      </div>
    );
  }
  if (value === false) {
    return (
      <div className="flex justify-center">
        <span className="text-muted-foreground/40">—</span>
      </div>
    );
  }
  return <span className="text-sm font-medium">{value}</span>;
}

export const Comparison = async () => {
  const { t } = await getTranslation({ ns: "marketing" });

  return (
    <Section id="comparison">
      <SectionHeader>
        <SectionBadge>{t("comparison.label")}</SectionBadge>
        <SectionTitle>{t("comparison.title")}</SectionTitle>
        <SectionDescription>{t("comparison.description")}</SectionDescription>
      </SectionHeader>

      <div className="mt-10 w-full overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-muted-foreground pb-4 text-left text-sm font-medium">
                {t("comparison.table.feature")}
              </th>
              {(["free", "pro", "business"] as const).map((plan) => (
                <th key={plan} className="pb-4 text-center">
                  <div
                    className={
                      plan === "pro"
                        ? "text-primary text-sm font-semibold"
                        : "text-sm font-semibold"
                    }
                  >
                    {t(`comparison.table.plans.${plan}`)}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {t(`comparison.table.prices.${plan}`)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((feature) => (
              <tr
                key={feature.key}
                className="border-border/50 hover:bg-muted/30 border-b transition-colors"
              >
                <td className="py-3 pr-4 text-sm">
                  {t(`comparison.table.features.${feature.key}`)}
                </td>
                <td className="py-3 text-center">
                  <CellValue
                    value={
                      typeof feature.free === "string"
                        ? t(feature.free)
                        : feature.free
                    }
                  />
                </td>
                <td className="py-3 text-center">
                  <CellValue
                    value={
                      typeof feature.pro === "string"
                        ? t(feature.pro)
                        : feature.pro
                    }
                  />
                </td>
                <td className="py-3 text-center">
                  <CellValue
                    value={
                      typeof feature.business === "string"
                        ? t(feature.business)
                        : feature.business
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
};
