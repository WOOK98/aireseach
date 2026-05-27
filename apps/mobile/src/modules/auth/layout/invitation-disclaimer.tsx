"use client";

import { useTranslation } from "@workspace/i18n";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui-mobile/alert";
import { Icons } from "@workspace/ui-mobile/icons";

export const InvitationDisclaimer = () => {
  const { t } = useTranslation("organization");

  return (
    <Alert icon={Icons.MailPlus} variant="primary">
      <AlertTitle>{t("invitations.disclaimer.title")}</AlertTitle>
      <AlertDescription>
        {t("invitations.disclaimer.description")}
      </AlertDescription>
    </Alert>
  );
};
