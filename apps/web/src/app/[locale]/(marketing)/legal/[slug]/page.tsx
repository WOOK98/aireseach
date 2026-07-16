import { CollectionType, getContentItems } from "@workspace/cms";

import { getLegalMetadata, LegalPage } from "~/modules/marketing/legal/page";

interface PageParams {
  params: Promise<{
    slug: string;
    locale: string;
  }>;
}

export default async function Page({ params }: PageParams) {
  const { slug, locale } = await params;

  return <LegalPage slug={slug} locale={locale} />;
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
  const { slug, locale } = await params;

  return getLegalMetadata({ slug, locale })({ params });
}
