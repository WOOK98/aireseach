import { getTranslation } from "@workspace/i18n/server";
import { withI18n } from "@workspace/i18n/with-i18n";

import { getMetadata } from "~/lib/metadata";
import { ContactForm } from "~/modules/marketing/contact/contact-form";
import {
  Section,
  SectionBadge,
  SectionDescription,
  SectionHeader,
  SectionTitle,
} from "~/modules/marketing/layout/section";

export const revalidate = 3600; // ISR

export const generateMetadata = getMetadata({
  title: "marketing:contact.label",
  description: "marketing:contact.description",
});

const ContactPage = async () => {
  const { t } = await getTranslation({ ns: "marketing" });
  return (
    <Section>
      <SectionHeader>
        <SectionBadge>{t("contact.label")}</SectionBadge>
        <SectionTitle>{t("contact.title")}</SectionTitle>
        <SectionDescription>{t("contact.description")}</SectionDescription>
      </SectionHeader>

      <ContactForm />
    </Section>
  );
};

export default withI18n(ContactPage);
