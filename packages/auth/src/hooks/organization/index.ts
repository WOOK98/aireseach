import * as addMember from "./add-member";
import * as deleteOrganization from "./delete";
import * as removeMember from "./remove-member";
import { OrganizationHooks } from "./types";

export const organization = {
  ...addMember,
  ...removeMember,
  ...deleteOrganization,
} satisfies OrganizationHooks;
