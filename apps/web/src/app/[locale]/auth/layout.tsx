import Image from "next/image";

import { getTranslation } from "@workspace/i18n/server";
import { Icons } from "@workspace/ui-web/icons";

import { pathsConfig } from "~/config/paths";
import { TurboLink } from "~/modules/common/turbo-link";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = await getTranslation({ ns: "common" });

  return (
    <main className="grid w-full flex-1 lg:grid-cols-2">
      <section className="flex h-full flex-col items-center justify-center p-6 lg:p-10">
        <header className="text-navy -mt-1 mb-auto flex self-start justify-self-start">
          <TurboLink
            href={pathsConfig.index}
            className="flex shrink-0 items-center gap-3"
            aria-label={t("home")}
          >
            <Icons.Logo className="text-primary h-8" />
            <Icons.LogoText className="text-foreground h-4" />
          </TurboLink>
        </header>
        <div className="mt-16 mb-auto flex w-full max-w-md flex-col gap-6 pb-16">
          {children}
        </div>
      </section>

      <aside className="relative hidden flex-1 lg:block">
        <Image
          src="/images/auth-background.jpg"
          alt="Auth Background"
          className="h-full w-full object-cover"
          fill
        />
      </aside>
    </main>
  );
}
