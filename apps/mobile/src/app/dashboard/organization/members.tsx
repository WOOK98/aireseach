import { useState } from "react";

import { toMemberRole } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { Button } from "@workspace/ui-mobile/button";
import { Icons } from "@workspace/ui-mobile/icons";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui-mobile/tabs";
import { Text } from "@workspace/ui-mobile/text";

import { authClient } from "~/lib/auth";
import { SafeAreaView } from "~/modules/common/styled";
import { InvitationsList } from "~/modules/organization/invitations/list/invitations-list";
import { InviteMemberBottomSheet } from "~/modules/organization/members/invite-member";
import { MembersList } from "~/modules/organization/members/list/members-list";

export default function Members() {
  const { t } = useTranslation(["common", "organization"]);
  const [tab, setTab] = useState("members");

  const activeMember = authClient.useActiveMember();

  const hasInvitePermission = authClient.organization.checkRolePermission({
    permissions: {
      invitation: ["create"],
    },
    role: toMemberRole(activeMember.data?.role),
  });

  return (
    <SafeAreaView
      className="bg-background flex-1 gap-4 p-6"
      edges={["top", "left", "right"]}
    >
      <Tabs value={tab} onValueChange={setTab} className="flex-1">
        <TabsList className="w-full">
          <TabsTrigger value="members" className="grow">
            <Text>{t("members.title")}</Text>
          </TabsTrigger>
          <TabsTrigger value="invitations" className="grow">
            <Text>{t("invitations.title")}</Text>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="flex-1">
          <MembersList />
        </TabsContent>
        <TabsContent value="invitations" className="flex-1">
          <InvitationsList />
        </TabsContent>
      </Tabs>

      <InviteMemberBottomSheet>
        <Button disabled={!hasInvitePermission} size="lg">
          <Icons.UserRoundPlus size={20} className="text-primary-foreground" />
          <Text>{t("invite")}</Text>
        </Button>
      </InviteMemberBottomSheet>
    </SafeAreaView>
  );
}
