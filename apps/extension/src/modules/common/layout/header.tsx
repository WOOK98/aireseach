import { LocaleCustomizer } from "@workspace/ui-web/i18n";

import { authClient } from "~/lib/auth";
import { useLocale } from "~/lib/i18n";
import { ThemeControls } from "~/modules/common/theme";
import {
  UserNavigation,
  UserNavigationSkeleton,
} from "~/modules/user/user-navigation";

import { useElementById } from "../hooks/use-element-by-id";

import type { User } from "@workspace/auth";

export const Header = () => {
  const { change } = useLocale();
  const container = useElementById("main");

  return (
    <div className="flex items-center justify-between gap-2">
      <LocaleCustomizer
        onChange={change}
        variant="icon"
        container={container}
      />
      <ThemeControls />
      <User />
    </div>
  );
};

const User = () => {
  const session = authClient.useSession();

  if (session.isPending) {
    return <UserNavigationSkeleton />;
  }
  const user = session.data?.user;

  return user ? (
    <AuthenticatedUser user={user} />
  ) : (
    <UserNavigation user={null} organization={null} />
  );
};

const AuthenticatedUser = ({ user }: { user: User }) => {
  const organization = authClient.useActiveOrganization();

  if (organization.isPending) {
    return <UserNavigationSkeleton />;
  }

  return (
    <UserNavigation user={user ?? null} organization={organization.data} />
  );
};
