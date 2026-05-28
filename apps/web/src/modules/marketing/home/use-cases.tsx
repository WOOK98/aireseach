import { getTranslation } from "@workspace/i18n/server";
import {
  Section,
  SectionBadge,
  SectionDescription,
  SectionHeader,
  SectionTitle,
} from "~/modules/marketing/layout/section";

const useCases = [
  {
    emoji: "🚀",
    title: "Founders",
    description:
      "Validate new markets, size TAM/SAM/SOM, and benchmark competitors before committing resources.",
  },
  {
    emoji: "📊",
    title: "Analysts",
    description:
      "Accelerate due diligence with structured reports — market share, financials, and risk in one output.",
  },
  {
    emoji: "💼",
    title: "Consultants",
    description:
      "Generate client-ready research deliverables in minutes instead of days. Export Markdown to any format.",
  },
  {
    emoji: "🏦",
    title: "Investors",
    description:
      "Size opportunities, assess antifragility, and compare competitive pressure across portfolio targets.",
  },
  {
    emoji: "⚙️",
    title: "Operators",
    description:
      "Track industry shifts, benchmark against peers, and build data-backed strategy memos.",
  },
  {
    emoji: "🎓",
    title: "Researchers",
    description:
      "Ground analysis in sourced evidence. Every claim links back to public filings, news, or market data.",
  },
];

export const UseCases = async () => {
  const { t } = await getTranslation({ ns: "marketing" });

  return (
    <Section id="use-cases">
      <SectionHeader>
        <SectionBadge>{t("useCases.label")}</SectionBadge>
        <SectionTitle>{t("useCases.title")}</SectionTitle>
        <SectionDescription>{t("useCases.description")}</SectionDescription>
      </SectionHeader>

      <div className="mt-10 grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {useCases.map((useCase) => (
          <div
            key={useCase.title}
            className="group bg-card hover:bg-accent/50 rounded-xl border p-5 transition-colors"
          >
            <div className="mb-3 text-2xl">{useCase.emoji}</div>
            <h3 className="text-base font-semibold">{useCase.title}</h3>
            <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
              {useCase.description}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
};
