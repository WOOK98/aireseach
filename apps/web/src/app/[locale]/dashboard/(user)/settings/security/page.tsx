import { redirect } from "next/navigation";

import { authConfig } from "~/config/auth";
import { pathsConfig } from "~/config/paths";
import { getSession } from "~/lib/auth/server";
import { getMetadata } from "~/lib/metadata";
import { EditEmail } from "~/modules/user/settings/general/edit-email";
import { Accounts } from "~/modules/user/settings/security/accounts";
import { EditPassword } from "~/modules/user/settings/security/edit-password";
import { Passkeys } from "~/modules/user/settings/security/passkeys";
import { Sessions } from "~/modules/user/settings/security/sessions";
import { TwoFactorAuthentication } from "~/modules/user/settings/security/two-factor/two-factor";

export const generateMetadata = getMetadata({
  title: "auth:account.settings.security.title",
  description: "auth:account.settings.security.description",
});

export default async function SettingsPage() {
  const { user } = await getSession();

  if (!user) {
    return redirect(pathsConfig.auth.login);
  }

  return (
    <>
      <EditEmail user={user} />
      <EditPassword />
      <Accounts />
      {authConfig.providers.passkey && <Passkeys />}
      <TwoFactorAuthentication />
      <Sessions />
    </>
  );
}
