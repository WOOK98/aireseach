import { getTranslation } from "@workspace/i18n/server";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui-web/accordion";
import { buttonVariants } from "@workspace/ui-web/button";
import { Icons } from "@workspace/ui-web/icons";

import { pathsConfig } from "~/config/paths";
import { TurboLink } from "~/modules/common/turbo-link";
import {
  Section,
  SectionHeader,
  SectionBadge,
  SectionTitle,
  SectionDescription,
} from "~/modules/marketing/layout/section";

const questions = [
  {
    question: "faq.question.whatDoesOurPlatformDo.question",
    answer: "faq.question.whatDoesOurPlatformDo.answer",
  },
  {
    question: "faq.question.howWillThisBenefitMyBusiness.question",
    answer: "faq.question.howWillThisBenefitMyBusiness.answer",
  },
  {
    question: "faq.question.isMyDataSafe.question",
    answer: "faq.question.isMyDataSafe.answer",
  },
  {
    question: "faq.question.whatKindOfIntegrationsAreAvailable.question",
    answer: "faq.question.whatKindOfIntegrationsAreAvailable.answer",
  },
  {
    question: "faq.question.howEasyIsItToOnboardMyTeam.question",
    answer: "faq.question.howEasyIsItToOnboardMyTeam.answer",
  },
  {
    question: "faq.question.whatTypesOfBusinessesCanUseThis.question",
    answer: "faq.question.whatTypesOfBusinessesCanUseThis.answer",
  },
  {
    question: "faq.question.canICustomizeThisToFitMyBusinessNeeds.question",
    answer: "faq.question.canICustomizeThisToFitMyBusinessNeeds.answer",
  },
] as const;

export const Faq = async () => {
  const { t } = await getTranslation({ ns: "marketing" });

  return (
    <Section id="faq" className="lg:flex-row lg:items-start">
      <SectionHeader className="grow basis-0 lg:items-start">
        <SectionBadge>{t("faq.label")}</SectionBadge>
        <SectionTitle className="lg:text-left">{t("faq.title")}</SectionTitle>
        <SectionDescription className="lg:text-left">
          {t("faq.description")}
        </SectionDescription>

        <TurboLink
          href={pathsConfig.marketing.contact}
          className={buttonVariants({
            variant: "outline",
          })}
        >
          {t("faq.cta")}
          <Icons.ArrowRight className="ml-1 size-4" />
        </TurboLink>
      </SectionHeader>

      <Accordion multiple className="grow basis-0">
        {questions.map((question) => (
          <AccordionItem key={question.question} value={question.question}>
            <AccordionTrigger className="text-base">
              {t(question.question)}
            </AccordionTrigger>
            <AccordionContent className="text-base">
              {t(question.answer)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Section>
  );
};
