import { notFound } from "next/navigation";

import { config, isLocaleSupported } from "@workspace/i18n";

import { getMetadata } from "~/lib/metadata";
import { Providers } from "~/lib/providers/providers";
import { ImpersonatingBanner } from "~/modules/admin/users/user/impersonating-banner";
import { BaseLayout } from "~/modules/common/layout/base";
import { Toaster } from "~/modules/common/toast";
import { BuyCtaDialog } from "~/modules/marketing/layout/buy-cta-dialog";

export function generateStaticParams() {
  return config.locales.map((locale) => ({ locale }));
}

export const generateMetadata = getMetadata();

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = (await params).locale;

  if (!isLocaleSupported(locale)) {
    return notFound();
  }

  return (
    <BaseLayout locale={locale}>
      <Providers locale={locale}>
        <ImpersonatingBanner />
        {children}
        <BuyCtaDialog />
        <Toaster />
      </Providers>
    </BaseLayout>
  );
}
