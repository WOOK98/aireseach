import { redirect } from "next/navigation";

import { hasAdminPermission } from "@workspace/auth";
import { Icons } from "@workspace/ui-web/icons";
import { SidebarInset, SidebarProvider } from "@workspace/ui-web/sidebar";

import { pathsConfig } from "~/config/paths";
import { getSession } from "~/lib/auth/server";
import { DashboardActionBar } from "~/modules/common/layout/dashboard/action-bar";
import { DashboardInset } from "~/modules/common/layout/dashboard/inset";
import { DashboardSidebar } from "~/modules/common/layout/dashboard/sidebar/index";
import { TurboLink } from "~/modules/common/turbo-link";

const menu = [
  {
    label: "admin",
    items: [
      {
        title: "home",
        href: pathsConfig.admin.index,
        icon: <Icons.Home />,
      },
      {
        title: "users",
        href: pathsConfig.admin.users.index,
        exact: false,
        icon: <Icons.UsersRound />,
      },
      {
        title: "organizations",
        href: pathsConfig.admin.organizations.index,
        exact: false,
        icon: <Icons.Building />,
      },
      {
        title: "customers",
        href: pathsConfig.admin.customers.index,
        exact: false,
        icon: <Icons.HandCoins />,
      },
    ],
  },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getSession();

  if (!user) {
    return redirect(pathsConfig.auth.login);
  }

  if (!hasAdminPermission(user)) {
    return redirect(pathsConfig.dashboard.user.index);
  }

  return (
    <SidebarProvider>
      <DashboardSidebar
        user={user}
        menu={menu}
        header={
          <TurboLink
            href={pathsConfig.index}
            className="flex items-center gap-3 p-2 transition-[padding] group-data-[collapsible=icon]:p-0.5"
          >
            <Icons.Logo className="text-primary h-8 transition-[width,height]" />
            <Icons.LogoText className="text-foreground h-4 group-data-[collapsible=icon]:hidden" />
          </TurboLink>
        }
      />
      <SidebarInset>
        <DashboardActionBar menu={menu} />
        <DashboardInset>{children}</DashboardInset>
      </SidebarInset>
    </SidebarProvider>
  );
}
