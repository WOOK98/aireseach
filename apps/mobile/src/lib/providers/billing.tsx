import { useEffect } from "react";

import { BillingReference } from "@workspace/billing";
import { Provider, useCustomer } from "@workspace/billing-mobile";

import { authClient } from "~/lib/auth";
import { useI18nConfig } from "~/lib/providers/i18n";

const Identity = () => {
  const { identify, reset } = useCustomer();
  const session = authClient.useSession();
  const activeOrganization = authClient.useActiveOrganization();

  useEffect(() => {
    if (session.isPending) {
      return;
    }

    if (!session.data?.user) {
      reset();
      return;
    }

    if (activeOrganization.isPending) {
      return;
    }

    const organizationId = activeOrganization.data?.id;
    const { referenceType, referenceId } = organizationId
      ? {
          referenceType: BillingReference.ORGANIZATION,
          referenceId: organizationId,
        }
      : {
          referenceType: BillingReference.USER,
          referenceId: session.data.user.id,
        };

    identify(referenceId, {
      referenceType,
    });
  }, [session, activeOrganization, identify, reset]);

  return null;
};

export const BillingProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { locale } = useI18nConfig((state) => state.config);

  return (
    <Provider locale={locale}>
      {children}
      <Identity />
    </Provider>
  );
};
