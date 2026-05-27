import { Hono } from "hono";

import { validate } from "../../../middleware";
import {
  getUserAccountsInputSchema,
  getUsersInputSchema,
  getUserMembershipsInputSchema,
  getUserInvitationsInputSchema,
  getUserSubscriptionsInputSchema,
  getUserOrdersInputSchema,
} from "../../../schema";
import { deleteAccount } from "./mutations";
import {
  getUsers,
  getUserAccounts,
  getUserMemberships,
  getUserInvitations,
  getUserSubscriptions,
  getUserOrders,
} from "./queries";

export const usersRouter = new Hono()
  .get("/", validate("query", getUsersInputSchema), async (c) =>
    c.json(await getUsers(c.req.valid("query"))),
  )
  .get(
    "/:id/accounts",
    validate("query", getUserAccountsInputSchema),
    async (c) =>
      c.json(
        await getUserAccounts({
          userId: c.req.param("id"),
          ...c.req.valid("query"),
        }),
      ),
  )
  .get(
    "/:id/subscriptions",
    validate("query", getUserSubscriptionsInputSchema),
    async (c) =>
      c.json(
        await getUserSubscriptions({
          userId: c.req.param("id"),
          ...c.req.valid("query"),
        }),
      ),
  )
  .get("/:id/orders", validate("query", getUserOrdersInputSchema), async (c) =>
    c.json(
      await getUserOrders({
        userId: c.req.param("id"),
        ...c.req.valid("query"),
      }),
    ),
  )
  .get(
    "/:id/memberships",
    validate("query", getUserMembershipsInputSchema),
    async (c) =>
      c.json(
        await getUserMemberships({
          userId: c.req.param("id"),
          ...c.req.valid("query"),
        }),
      ),
  )
  .get(
    "/:id/invitations",
    validate("query", getUserInvitationsInputSchema),
    async (c) =>
      c.json(
        await getUserInvitations({
          userId: c.req.param("id"),
          ...c.req.valid("query"),
        }),
      ),
  )
  .delete("/:id/accounts/:accountId", async (c) =>
    c.json(await deleteAccount({ id: c.req.param("accountId") })),
  );
