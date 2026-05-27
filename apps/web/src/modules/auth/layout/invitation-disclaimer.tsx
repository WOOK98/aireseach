"use client";

import { useTranslation } from "@workspace/i18n";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui-web/alert";
import { Icons } from "@workspace/ui-web/icons";

export const InvitationDisclaimer = () => {
  const { t } = useTranslation("organization");

  return (
    <Alert variant="primary">
      <Icons.MailPlus />
      <AlertTitle>{t("invitations.disclaimer.title")}</AlertTitle>
      <AlertDescription>
        {t("invitations.disclaimer.description")}
      </AlertDescription>
    </Alert>
  );
};
