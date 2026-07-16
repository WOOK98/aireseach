import { notFound } from "next/navigation";

import { CollectionType, getContentItemBySlug } from "@workspace/cms";
import { getTranslation } from "@workspace/i18n/server";

import { getMetadata } from "~/lib/metadata";
import { Mdx } from "~/modules/common/mdx";
import {
  Section,
  SectionBadge,
  SectionDescription,
  SectionHeader,
  SectionTitle,
} from "~/modules/marketing/layout/section";

interface LegalPageProps {
  readonly locale?: string;
  readonly slug: string;
}

const getLegalItem = ({ slug, locale }: LegalPageProps) =>
  getContentItemBySlug({
    collection: CollectionType.LEGAL,
    slug,
    locale,
  });

export const LegalPage = async ({ slug, locale }: LegalPageProps) => {
  const item = getLegalItem({ slug, locale });

  if (!item) {
    return notFound();
  }

  const { t } = await getTranslation({ ns: "common" });

  return (
    <Section>
      <SectionHeader>
        <SectionBadge>{t("legal.label")}</SectionBadge>
        <SectionTitle as="h1">{item.title}</SectionTitle>
        <SectionDescription>{item.description}</SectionDescription>
      </SectionHeader>
      <Mdx mdx={item.mdx} />
    </Section>
  );
};

export const getLegalMetadata =
  ({
    slug,
    locale: passedLocale,
    canonical,
  }: LegalPageProps & { readonly canonical?: string }) =>
  async ({ params }: { params?: Promise<{ locale: string }> }) => {
    const locale = passedLocale ?? (await params)?.locale;
    const item = getLegalItem({ slug, locale });

    if (!item) {
      return notFound();
    }

    return getMetadata({
      title: item.title,
      description: item.description,
      canonical,
    })({ params });
  };
