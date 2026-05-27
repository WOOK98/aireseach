import dayjs from "dayjs";
import { View } from "react-native";

import { useTranslation } from "@workspace/i18n";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@workspace/ui-mobile/avatar";
import { Badge } from "@workspace/ui-mobile/badge";
import { Card } from "@workspace/ui-mobile/card";
import { Text } from "@workspace/ui-mobile/text";

import type { Invitation } from "@workspace/auth";

interface InvitationSummaryCardProps {
  readonly invitation: Invitation;
  readonly organization: {
    slug: string | null;
    name: string;
    logo: string | null;
  };
}

export const InvitationSummaryCard = ({
  invitation,
  organization,
}: InvitationSummaryCardProps) => {
  const { t } = useTranslation("common");

  return (
    <Card className="flex-row items-center gap-4 p-4">
      <Avatar className="size-10" alt={organization.name}>
        <AvatarImage source={{ uri: organization.logo ?? undefined }} />
        <AvatarFallback>
          <Text className="text-muted-foreground text-xl uppercase">
            {organization.name.charAt(0)}
          </Text>
        </AvatarFallback>
      </Avatar>

      <View>
        <Text className="font-sans-medium leading-tight" numberOfLines={1}>
          {organization.name}
        </Text>
        <Text className="text-muted-foreground text-sm">
          {t("expires")} {dayjs(invitation.expiresAt).fromNow()}
        </Text>
      </View>

      <Badge variant="outline" className="ml-auto">
        <Text>{t(invitation.role)}</Text>
      </Badge>
    </Card>
  );
};
