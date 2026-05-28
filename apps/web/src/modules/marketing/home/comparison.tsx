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
    name: "Reports per month",
    free: "3",
    pro: "Unlimited",
    business: "Unlimited",
  },
  {
    name: "Analysis lenses",
    free: "1 (Comprehensive)",
    pro: "All 6 lenses",
    business: "All 6 lenses",
  },
  {
    name: "Perplexity Deep Research",
    free: false,
    pro: true,
    business: true,
  },
  {
    name: "Report history & saved reports",
    free: false,
    pro: true,
    business: true,
  },
  {
    name: "Custom model endpoints",
    free: false,
    pro: true,
    business: true,
  },
  {
    name: "Markdown export",
    free: true,
    pro: true,
    business: true,
  },
  {
    name: "Team workspace (up to 5 seats)",
    free: false,
    pro: false,
    business: true,
  },
  {
    name: "Shared report library",
    free: false,
    pro: false,
    business: true,
  },
  {
    name: "API access",
    free: false,
    pro: false,
    business: true,
  },
  {
    name: "Custom report templates",
    free: false,
    pro: false,
    business: true,
  },
  {
    name: "Branded PDF export",
    free: false,
    pro: false,
    business: true,
  },
  {
    name: "Support",
    free: "Community",
    pro: "Email",
    business: "Priority",
  },
];

const labels = {
  feature: "Feature",
  plans: [
    { name: "Free", price: "$0/mo", highlighted: false },
    { name: "Pro", price: "$19/mo", highlighted: true },
    { name: "Business", price: "$49/mo", highlighted: false },
  ],
} as const;

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
                {labels.feature}
              </th>
              {labels.plans.map((plan) => (
                <th key={plan.name} className="pb-4 text-center">
                  <div
                    className={
                      plan.highlighted
                        ? "text-primary text-sm font-semibold"
                        : "text-sm font-semibold"
                    }
                  >
                    {plan.name}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {plan.price}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((feature) => (
              <tr
                key={feature.name}
                className="border-border/50 hover:bg-muted/30 border-b transition-colors"
              >
                <td className="py-3 pr-4 text-sm">{feature.name}</td>
                <td className="py-3 text-center">
                  <CellValue value={feature.free} />
                </td>
                <td className="py-3 text-center">
                  <CellValue value={feature.pro} />
                </td>
                <td className="py-3 text-center">
                  <CellValue value={feature.business} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
};
