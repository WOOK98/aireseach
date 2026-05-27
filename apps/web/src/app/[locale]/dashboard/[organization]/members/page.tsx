import { notFound } from "next/navigation";

import { getTranslation } from "@workspace/i18n/server";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui-web/tabs";

import { getOrganization } from "~/lib/auth/server";
import { getMetadata } from "~/lib/metadata";
import { InvitationsDataTable } from "~/modules/organization/invitations/data-table/invitations-data-table";
import { MembersDataTable } from "~/modules/organization/members/data-table/members-data-table";
import { InviteMember } from "~/modules/organization/members/invite-member";

export const generateMetadata = getMetadata({
  title: "organization:members.title",
  description: "organization:members.header.description",
});

export default async function MembersPage({
  params,
}: {
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;

  const activeOrganization = await getOrganization({ slug: organization });

  if (!activeOrganization) {
    return notFound();
  }

  const { t } = await getTranslation({ ns: "organization" });

  return (
    <>
      <InviteMember organizationId={activeOrganization.id} />

      <Tabs defaultValue="members" className="mt-4 w-full">
        <TabsList>
          <TabsTrigger value="members">{t("members.title")}</TabsTrigger>
          <TabsTrigger value="invitations">
            {t("invitations.title")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <MembersDataTable organizationId={activeOrganization.id} />
        </TabsContent>
        <TabsContent value="invitations">
          <InvitationsDataTable organizationId={activeOrganization.id} />
        </TabsContent>
      </Tabs>
    </>
  );
}
