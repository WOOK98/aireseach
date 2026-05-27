import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";

import { getBillingSummaryResponseSchema } from "@workspace/api/schema";
import { handle } from "@workspace/api/utils";
import { Member, toMemberRole } from "@workspace/auth";
import { Icons } from "@workspace/ui-web/icons";
import { SidebarInset, SidebarProvider } from "@workspace/ui-web/sidebar";

import { pathsConfig } from "~/config/paths";
import { api } from "~/lib/api/server";
import { authClient } from "~/lib/auth/client";
import { getOrganization, getSession } from "~/lib/auth/server";
import { getQueryClient } from "~/lib/query/server";
import { billing } from "~/modules/billing/lib/api";
import { DashboardActionBar } from "~/modules/common/layout/dashboard/action-bar";
import { DashboardInset } from "~/modules/common/layout/dashboard/inset";
import { DashboardSidebar } from "~/modules/common/layout/dashboard/sidebar/index";
import { organization } from "~/modules/organization/lib/api";

const menu = ({ slug, member }: { slug: string; member: Member | null }) => [
  {
    label: "platform",
    items: [
      {
        title: "home",
        href: pathsConfig.dashboard.organization(slug).index,
        icon: <Icons.Home />,
      },
    ],
  },
  {
    label: "organization",
    items: [
      {
        title: "settings",
        href: pathsConfig.dashboard.organization(slug).settings.index,
        icon: <Icons.Settings />,
        menu: [
          {
            items: [
              {
                title: "general",
                href: pathsConfig.dashboard.organization(slug).settings.index,
                icon: <Icons.Settings />,
              },
              ...(authClient.organization.checkRolePermission({
                permissions: {
                  billing: ["read"],
                },
                role: toMemberRole(member?.role),
              })
                ? [
                    {
                      title: "billing",
                      href: pathsConfig.dashboard.organization(slug).settings
                        .billing,
                      icon: <Icons.CreditCard />,
                    },
                  ]
                : []),
            ],
          },
        ],
      },
      {
        title: "members",
        href: pathsConfig.dashboard.organization(slug).members,
        icon: <Icons.UsersRound />,
      },
    ],
  },
];

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{
    organization: string;
  }>;
}) {
  const { user } = await getSession();

  if (!user) {
    return redirect(pathsConfig.auth.login);
  }

  const organizationSlug = (await params).organization;
  const activeOrganization = await getOrganization({ slug: organizationSlug });

  if (!activeOrganization) {
    return redirect(pathsConfig.dashboard.user.index);
  }

  const queryClient = getQueryClient();
  queryClient.setQueryData(
    organization.queries.get({ slug: organizationSlug }).queryKey,
    activeOrganization,
  );
  queryClient.setQueryData(
    organization.queries.get({ id: activeOrganization.id }).queryKey,
    activeOrganization,
  );
  await queryClient.prefetchQuery({
    ...billing.queries.summary.get(activeOrganization.id),
    queryFn: () =>
      handle(api.billing.summary.$get, {
        schema: getBillingSummaryResponseSchema,
      })({
        query: { referenceId: activeOrganization.id },
      }),
  });

  const items = menu({
    slug: organizationSlug,
    member:
      activeOrganization.members.find((member) => member.userId === user.id) ??
      null,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SidebarProvider>
        <DashboardSidebar user={user} menu={items} />
        <SidebarInset>
          <DashboardActionBar menu={items} />
          <DashboardInset>{children}</DashboardInset>
        </SidebarInset>
      </SidebarProvider>
    </HydrationBoundary>
  );
}
