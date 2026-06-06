import { notFound } from "next/navigation";
import { lazy, Suspense } from "react";

import { config, isLocaleSupported } from "@workspace/i18n";

import { getMetadata } from "~/lib/metadata";
import { Providers } from "~/lib/providers/providers";
import { BaseLayout } from "~/modules/common/layout/base";
import { Toaster } from "~/modules/common/toast";

const ImpersonatingBanner = lazy(() =>
  import("~/modules/admin/users/user/impersonating-banner").then((m) => ({
    default: m.ImpersonatingBanner,
  })),
);

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
        <Suspense fallback={null}>
          <ImpersonatingBanner />
        </Suspense>
        {children}

        <Toaster />
      </Providers>
    </BaseLayout>
  );
}
