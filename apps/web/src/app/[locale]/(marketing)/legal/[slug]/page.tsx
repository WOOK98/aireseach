import { notFound } from "next/navigation";

import {
  CollectionType,
  getContentItemBySlug,
  getContentItems,
} from "@workspace/cms";
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

interface PageParams {
  params: Promise<{
    slug: string;
    locale: string;
  }>;
}

export default async function Page({ params }: PageParams) {
  const item = getContentItemBySlug({
    collection: CollectionType.LEGAL,
    slug: (await params).slug,
    locale: (await params).locale,
  });

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
}

export function generateStaticParams() {
  return getContentItems({ collection: CollectionType.LEGAL }).items.map(
    ({ slug, locale }) => ({
      slug,
      locale,
    }),
  );
}

export async function generateMetadata({ params }: PageParams) {
  const item = getContentItemBySlug({
    collection: CollectionType.LEGAL,
    slug: (await params).slug,
    locale: (await params).locale,
  });

  if (!item) {
    return notFound();
  }

  return getMetadata({
    title: item.title,
    description: item.description,
  })({ params });
}
