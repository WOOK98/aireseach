import { View } from "react-native";

import { BuiltWith } from "@workspace/ui-mobile/built-with";

import { ScrollView } from "~/modules/common/styled";
import { UserOrganizationInvitationsBanner } from "~/modules/organization/invitations/user/user-organization-invitations";
import { OrganizationPicker } from "~/modules/organization/organization-picker";

export default function Home() {
  return (
    <ScrollView
      className="bg-background"
      contentContainerClassName="items-center bg-background grow gap-6 px-6 py-2"
      showsVerticalScrollIndicator={false}
    >
      <UserOrganizationInvitationsBanner />
      <OrganizationPicker />
      <View className="pt-4 pb-10">
        <BuiltWith />
      </View>
    </ScrollView>
  );
}
