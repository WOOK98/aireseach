import { syncSubscriptionSeats } from "../../lib/server";
import { OrganizationHooks } from "./types";

export const { beforeAddMember, afterAddMember, afterAcceptInvitation } = {
  beforeAddMember: async () => {
    /**
     * Here you can enforce any business logic before adding a member to the organization.
     * For example, for one-time per-seat purchase you can check if the organization has any
     * seats left and if not force the owner/admin to purchase more seats.
     */
  },
  afterAddMember: async ({ organization }) => {
    await syncSubscriptionSeats(organization.id);
  },
  afterAcceptInvitation: async ({ organization }) => {
    await syncSubscriptionSeats(organization.id);
  },
} satisfies OrganizationHooks;
