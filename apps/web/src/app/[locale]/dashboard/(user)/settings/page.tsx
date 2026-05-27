import { redirect } from "next/navigation";

import { pathsConfig } from "~/config/paths";
import { getSession } from "~/lib/auth/server";
import { getMetadata } from "~/lib/metadata";
import { DeleteAccount } from "~/modules/user/settings/general/delete-account";
import { EditAvatar } from "~/modules/user/settings/general/edit-avatar";
import { EditName } from "~/modules/user/settings/general/edit-name";
import { LanguageSwitcher } from "~/modules/user/settings/general/language-switcher";

export const generateMetadata = getMetadata({
  title: "auth:account.settings.title",
  description: "auth:account.settings.header.description",
});

export default async function SettingsPage() {
  const { user } = await getSession();

  if (!user) {
    return redirect(pathsConfig.auth.login);
  }

  return (
    <>
      <EditAvatar user={user} />
      <EditName user={user} />
      <LanguageSwitcher />
      <DeleteAccount user={user} />
    </>
  );
}
