import { useQuery } from "@tanstack/react-query";
import { Redirect, useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { handle } from "@workspace/api/utils";

import { pathsConfig } from "~/config/paths";
import { api } from "~/lib/api";
import { authClient } from "~/lib/auth";
import { Spinner } from "~/modules/common/spinner";
import { Invitation } from "~/modules/organization/invitations/invitation";
import { InvitationEmailMismatch } from "~/modules/organization/invitations/invitation-email-mismatch";
import { InvitationExpired } from "~/modules/organization/invitations/invitation-expired";
import { organization } from "~/modules/organization/lib/api";

const InvitationCheck = ({
  invitationId,
  email,
}: {
  invitationId: string;
  email?: string;
}) => {
  const session = authClient.useSession();
  const invitation = useQuery(
    organization.queries.invitations.get({ id: invitationId }),
  );
  const invitationOrganization = useQuery({
    queryKey: organization.queries.get({
      id: invitation.data?.organizationId ?? "",
    }).queryKey,
    queryFn: () =>
      handle(api.organizations[":id"].$get)({
        param: { id: invitation.data?.organizationId ?? "" },
      }),
    enabled: !!invitation.data,
  });

  if (invitation.isLoading || invitationOrganization.isLoading) {
    return <Spinner />;
  }

  if (invitation.data && invitationOrganization.data?.organization) {
    return (
      <Invitation
        invitation={invitation.data}
        organization={invitationOrganization.data.organization}
      />
    );
  }

  if (email && session.data?.user.email !== email) {
    return (
      <InvitationEmailMismatch invitationId={invitationId} email={email} />
    );
  }

  return <InvitationExpired />;
};

export default function Join() {
  const { invitationId, email } = useLocalSearchParams<{
    invitationId?: string;
    email?: string;
  }>();

  const session = authClient.useSession();
  if (session.isPending) {
    return (
      <View className="bg-background flex-1">
        <Spinner />
      </View>
    );
  }

  if (!invitationId) {
    return <Redirect href={pathsConfig.index} />;
  }

  if (!session.data?.user) {
    const searchParams = new URLSearchParams();
    searchParams.set("invitationId", invitationId);
    if (email) searchParams.set("email", email);
    searchParams.set(
      "redirectTo",
      `${pathsConfig.setup.auth.join}?${searchParams.toString()}`,
    );
    return (
      <Redirect
        href={`${pathsConfig.setup.auth.login}?${searchParams.toString()}`}
      />
    );
  }

  return (
    <View className="bg-background flex-1">
      <InvitationCheck invitationId={invitationId} email={email} />
    </View>
  );
}
