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
    key: "founders",
    emoji: "🚀",
  },
  {
    key: "analysts",
    emoji: "📊",
  },
  {
    key: "consultants",
    emoji: "💼",
  },
  {
    key: "investors",
    emoji: "🏦",
  },
  {
    key: "operators",
    emoji: "⚙️",
  },
  {
    key: "researchers",
    emoji: "🎓",
  },
] as const;

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
            key={useCase.key}
            className="group bg-card hover:bg-accent/50 rounded-xl border p-5 transition-colors"
          >
            <div className="mb-3 text-2xl">{useCase.emoji}</div>
            <h3 className="text-base font-semibold">
              {t(`useCases.items.${useCase.key}.title`)}
            </h3>
            <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
              {t(`useCases.items.${useCase.key}.description`)}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
};
