import { useLocalSearchParams } from "expo-router";

import { useTranslation } from "@workspace/i18n";

import { UpdatePasswordForm } from "~/modules/auth/form/password/update";
import { AuthLayout } from "~/modules/auth/layout/base";
import { AuthHeader } from "~/modules/auth/layout/header";

const UpdatePassword = () => {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { t } = useTranslation("auth");

  return (
    <AuthLayout>
      <AuthHeader
        title={t("account.password.update.header.title")}
        description={t("account.password.update.header.description")}
      />
      <UpdatePasswordForm token={token} />
    </AuthLayout>
  );
};

export default UpdatePassword;
