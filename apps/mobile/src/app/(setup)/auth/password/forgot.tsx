import { useTranslation } from "@workspace/i18n";

import { ForgotPasswordForm } from "~/modules/auth/form/password/forgot";
import { AuthLayout } from "~/modules/auth/layout/base";
import { AuthHeader } from "~/modules/auth/layout/header";

const ForgotPassword = () => {
  const { t } = useTranslation("auth");
  return (
    <AuthLayout>
      <AuthHeader
        title={t("account.password.forgot.header.title")}
        description={t("account.password.forgot.header.description")}
      />
      <ForgotPasswordForm />
    </AuthLayout>
  );
};

export default ForgotPassword;
