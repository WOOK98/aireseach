import { pathsConfig } from "~/config/paths";
import { getLegalMetadata, LegalPage } from "~/modules/marketing/legal/page";

const SLUG = "privacy-policy";

export const generateMetadata = getLegalMetadata({
  slug: SLUG,
  canonical: pathsConfig.marketing.privacy,
});

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return <LegalPage slug={SLUG} locale={(await params).locale} />;
}
