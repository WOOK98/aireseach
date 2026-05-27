import { getMetadata } from "~/lib/metadata";
import { UserOrganizationInvitationsBanner } from "~/modules/organization/invitations/user/user-organization-invitations";
import { OrganizationPicker } from "~/modules/organization/organization-picker";

export const generateMetadata = getMetadata({
  title: "common:home",
  description: "dashboard:user.home.description",
});

export default function UserPage() {
  return (
    <>
      <UserOrganizationInvitationsBanner />
      <OrganizationPicker />
    </>
  );
}
