import { syncSubscriptionSeats } from "../../lib/server";
import { OrganizationHooks } from "./types";

export const { beforeRemoveMember, afterRemoveMember } = {
  beforeRemoveMember: async () => {
    /**
     * Here you can communicate what will happen to the organization after removing a member.
     * For example, for one-time per-seat purchase you can signal that removing member
     * will release a seat back to the organization.
     * This will help the owner/admin to make a decision to purchase more seats or not.
     */
  },
  afterRemoveMember: async ({ organization }) => {
    await syncSubscriptionSeats(organization.id);
  },
} satisfies OrganizationHooks;
