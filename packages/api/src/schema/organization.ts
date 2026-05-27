import * as z from "zod";

import { InvitationStatus, MemberRole } from "@workspace/auth";
import { offsetPaginationSchema } from "@workspace/shared/schema";

import {
  rangeQuerySchema,
  multiValueQuerySchema,
  sortQuerySchema,
} from "./shared";

export const getMembersInputSchema = offsetPaginationSchema.extend({
  sort: sortQuerySchema.optional(),
  q: z.string().optional(),
  role: multiValueQuerySchema(z.enum(MemberRole)).optional(),
  createdAt: rangeQuerySchema.optional(),
});

export type GetMembersInput = z.infer<typeof getMembersInputSchema>;

export const getMembersResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      organizationId: z.string(),
      role: z.enum(MemberRole),
      createdAt: z.coerce.date(),
      userId: z.string(),
      user: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        image: z
          .string()
          .nullish()
          .transform((val) => (val === null ? undefined : val)),
      }),
    }),
  ),
  total: z.number(),
});

export type GetMembersResponse = z.infer<typeof getMembersResponseSchema>;

export const getInvitationsInputSchema = offsetPaginationSchema.extend({
  sort: sortQuerySchema.optional(),
  email: z.string().optional(),
  role: multiValueQuerySchema(z.enum(MemberRole)).optional(),
  status: multiValueQuerySchema(z.enum(InvitationStatus)).optional(),
  expiresAt: rangeQuerySchema.optional(),
});

export type GetInvitationsInput = z.infer<typeof getInvitationsInputSchema>;

export const getInvitationsResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      organizationId: z.string(),
      email: z.string(),
      role: z.enum(MemberRole),
      expiresAt: z.coerce.date(),
      createdAt: z.coerce.date(),
      inviterId: z.string(),
      status: z.enum(InvitationStatus),
    }),
  ),
  total: z.number(),
});

export type GetInvitationsResponse = z.infer<
  typeof getInvitationsResponseSchema
>;
