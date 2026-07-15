import { pathsConfig } from "~/config/paths";
import { getLegalMetadata, LegalPage } from "~/modules/marketing/legal/page";

const SLUG = "terms-and-conditions";

export const generateMetadata = getLegalMetadata({
  slug: SLUG,
  canonical: pathsConfig.marketing.terms,
});

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return <LegalPage slug={SLUG} locale={(await params).locale} />;
}
