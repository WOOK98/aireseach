import * as z from "zod";

import {
  InvitationStatus,
  MemberRole,
  SocialProvider,
  UserRole,
} from "@workspace/auth";
import { PaymentStatus, SubscriptionStatus } from "@workspace/billing";
import {
  selectCustomerSchema,
  selectOrderSchema,
  selectSubscriptionSchema,
} from "@workspace/db/schema";
import { offsetPaginationSchema } from "@workspace/shared/schema";

import {
  sortQuerySchema,
  multiValueQuerySchema,
  rangeQuerySchema,
} from "./shared";

export const getUsersInputSchema = offsetPaginationSchema.extend({
  sort: sortQuerySchema.optional(),
  q: z.string().optional(),
  role: multiValueQuerySchema(z.enum(UserRole)).optional(),
  twoFactorEnabled: multiValueQuerySchema(z.coerce.boolean()).optional(),
  banned: multiValueQuerySchema(z.coerce.boolean()).optional(),
  createdAt: rangeQuerySchema.optional(),
});

export type GetUsersInput = z.infer<typeof getUsersInputSchema>;

export const getUsersResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      createdAt: z.coerce.date(),
      updatedAt: z.coerce.date(),
      email: z.string(),
      emailVerified: z.boolean(),
      name: z.string(),
      image: z.string().nullish(),
      twoFactorEnabled: z.boolean().nullable(),
      isAnonymous: z.boolean(),
      banned: z.boolean().nullable(),
      role: z.string().nullish(),
      banReason: z.string().nullish(),
      banExpires: z.coerce.date().nullish(),
    }),
  ),
  total: z.number(),
});

export type GetUsersResponse = z.infer<typeof getUsersResponseSchema>;

export const getUserAccountsInputSchema = offsetPaginationSchema.extend({
  sort: sortQuerySchema.optional(),
  providerId: multiValueQuerySchema(
    z.enum(["credential", ...Object.values(SocialProvider)]),
  ).optional(),
  createdAt: rangeQuerySchema.optional(),
  updatedAt: rangeQuerySchema.optional(),
});

export type GetUserAccountsInput = z.infer<typeof getUserAccountsInputSchema>;

export const getUserSubscriptionsInputSchema = offsetPaginationSchema.extend({
  sort: sortQuerySchema.optional(),
  status: multiValueQuerySchema(z.enum(SubscriptionStatus)).optional(),
  createdAt: rangeQuerySchema.optional(),
});

export type GetUserSubscriptionsInput = z.infer<
  typeof getUserSubscriptionsInputSchema
>;

export const getUserSubscriptionsResponseSchema = z.object({
  data: z.array(selectSubscriptionSchema),
  total: z.number(),
});

export type GetUserSubscriptionsResponse = z.infer<
  typeof getUserSubscriptionsResponseSchema
>;

export const getUserOrdersInputSchema = offsetPaginationSchema.extend({
  sort: sortQuerySchema.optional(),
  status: multiValueQuerySchema(z.enum(PaymentStatus)).optional(),
  store: multiValueQuerySchema(z.string()).optional(),
  createdAt: rangeQuerySchema.optional(),
});
export type GetUserOrdersInput = z.infer<typeof getUserOrdersInputSchema>;

export const getUserOrdersResponseSchema = z.object({
  data: z.array(selectOrderSchema),
  total: z.number(),
});
export type GetUserOrdersResponse = z.infer<typeof getUserOrdersResponseSchema>;

export const getUserAccountsResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      userId: z.string(),
      providerId: z.string(),
      accountId: z.string(),
      createdAt: z.coerce.date(),
      updatedAt: z.coerce.date(),
    }),
  ),
  total: z.number(),
});

export type GetUserAccountsResponse = z.infer<
  typeof getUserAccountsResponseSchema
>;

export const getUserMembershipsInputSchema = offsetPaginationSchema.extend({
  sort: sortQuerySchema.optional(),
  role: multiValueQuerySchema(z.enum(MemberRole)).optional(),
  createdAt: rangeQuerySchema.optional(),
});

export type GetUserMembershipsInput = z.infer<
  typeof getUserMembershipsInputSchema
>;

export const getUserMembershipsResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      organizationId: z.string(),
      role: z.enum(MemberRole),
      createdAt: z.coerce.date(),
      userId: z.string(),
      organization: z.object({
        id: z.string(),
        name: z.string(),
        slug: z.string().nullish(),
        logo: z.string().nullish(),
      }),
      user: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
      }),
    }),
  ),
  total: z.number(),
});

export type GetUserMembershipsResponse = z.infer<
  typeof getUserMembershipsResponseSchema
>;

export const getUserInvitationsInputSchema = offsetPaginationSchema.extend({
  sort: sortQuerySchema.optional(),
  role: multiValueQuerySchema(z.enum(MemberRole)).optional(),
  status: multiValueQuerySchema(z.enum(InvitationStatus)).optional(),
  expiresAt: rangeQuerySchema.optional(),
});

export type GetUserInvitationsInput = z.infer<
  typeof getUserInvitationsInputSchema
>;

export const getUserInvitationsResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      email: z.string(),
      role: z.enum(MemberRole),
      status: z.enum(InvitationStatus),
      expiresAt: z.coerce.date(),
      createdAt: z.coerce.date(),
      inviterId: z.string(),
      organizationId: z.string(),
      organization: z.object({
        id: z.string(),
        name: z.string(),
        logo: z.string().nullish(),
      }),
    }),
  ),
  total: z.number(),
});

export type GetUserInvitationsResponse = z.infer<
  typeof getUserInvitationsResponseSchema
>;

export const getOrganizationsInputSchema = offsetPaginationSchema.extend({
  sort: sortQuerySchema.optional(),
  q: z.string().optional(),
  createdAt: rangeQuerySchema.optional(),
  members: rangeQuerySchema.optional(),
});

export type GetOrganizationsInput = z.infer<typeof getOrganizationsInputSchema>;

export const getOrganizationsResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string().nullish(),
      logo: z.string().nullish(),
      createdAt: z.coerce.date(),
      members: z.number(),
    }),
  ),
  total: z.number(),
  max: z.object({
    members: z.number(),
  }),
});

export type GetOrganizationsResponse = z.infer<
  typeof getOrganizationsResponseSchema
>;

export const getOrganizationResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    slug: z.string().nullish(),
    logo: z.string().nullish(),
    createdAt: z.coerce.date(),
  })
  .nullable();

export type GetOrganizationResponse = z.infer<
  typeof getOrganizationResponseSchema
>;

export const getOrganizationSubscriptionsInputSchema =
  offsetPaginationSchema.extend({
    sort: sortQuerySchema.optional(),
    status: multiValueQuerySchema(z.enum(SubscriptionStatus)).optional(),
    createdAt: rangeQuerySchema.optional(),
  });

export type GetOrganizationSubscriptionsInput = z.infer<
  typeof getOrganizationSubscriptionsInputSchema
>;

export const getOrganizationSubscriptionsResponseSchema = z.object({
  data: z.array(selectSubscriptionSchema),
  total: z.number(),
});

export type GetOrganizationSubscriptionsResponse = z.infer<
  typeof getOrganizationSubscriptionsResponseSchema
>;

export const getOrganizationOrdersInputSchema = offsetPaginationSchema.extend({
  sort: sortQuerySchema.optional(),
  status: multiValueQuerySchema(z.enum(PaymentStatus)).optional(),
  store: multiValueQuerySchema(z.string()).optional(),
  createdAt: rangeQuerySchema.optional(),
});

export type GetOrganizationOrdersInput = z.infer<
  typeof getOrganizationOrdersInputSchema
>;

export const getOrganizationOrdersResponseSchema = z.object({
  data: z.array(selectOrderSchema),
  total: z.number(),
});

export type GetOrganizationOrdersResponse = z.infer<
  typeof getOrganizationOrdersResponseSchema
>;

export const getCustomersInputSchema = offsetPaginationSchema.extend({
  sort: sortQuerySchema.optional(),
  q: z.string().optional(),
  provider: multiValueQuerySchema(z.string()).optional(),
  subscriptions: rangeQuerySchema.optional(),
  orders: rangeQuerySchema.optional(),
  createdAt: rangeQuerySchema.optional(),
});

export type GetCustomersInput = z.infer<typeof getCustomersInputSchema>;

export const getCustomersResponseSchema = z.object({
  data: z.array(
    selectCustomerSchema.extend({
      user: z
        .object({
          name: z.string(),
          image: z.string().nullish(),
        })
        .nullable(),
      organization: z
        .object({
          name: z.string(),
          logo: z.string().nullish(),
        })
        .nullable(),
      subscriptions: z.number(),
      orders: z.number(),
    }),
  ),
  total: z.number(),
  max: z.object({
    subscriptions: z.number(),
    orders: z.number(),
  }),
  options: z.object({
    provider: z.array(z.string()),
  }),
});

export type GetCustomersResponse = z.infer<typeof getCustomersResponseSchema>;
