import { auth } from "@workspace/auth/server";
import { and, eq } from "@workspace/db";
import { invitation, member, organization } from "@workspace/db/schema";
import { db } from "@workspace/db/server";
import { HttpStatusCode } from "@workspace/shared/constants";
import { HttpException } from "@workspace/shared/utils";

import type {
  UpdateMemberPayload,
  UpdateOrganizationPayload,
} from "@workspace/auth";

export const deleteOrganization = async ({ id }: { id: string }) =>
  db.delete(organization).where(eq(organization.id, id));

export const updateOrganization = async ({
  id,
  data,
}: {
  id: string;
  data: UpdateOrganizationPayload;
}) => {
  if (typeof data.slug === "string") {
    const current = await db.query.organization.findFirst({
      where: eq(organization.id, id),
      columns: { slug: true },
    });

    if (current?.slug !== data.slug) {
      let check: { status: boolean };
      try {
        check = await auth.api.checkOrganizationSlug({
          body: { slug: data.slug },
        });
      } catch {
        check = { status: false };
      }

      if (!check.status) {
        throw new HttpException(HttpStatusCode.BAD_REQUEST, {
          code: "organization:error.slugNotAvailable",
        });
      }
    }
  }

  return db.update(organization).set(data).where(eq(organization.id, id));
};

export const deleteOrganizationInvitation = async ({
  id,
  organizationId,
}: {
  id: string;
  organizationId: string;
}) =>
  db
    .delete(invitation)
    .where(
      and(eq(invitation.id, id), eq(invitation.organizationId, organizationId)),
    );

export const deleteOrganizationMember = async ({
  id,
  organizationId,
}: {
  id: string;
  organizationId: string;
}) =>
  db
    .delete(member)
    .where(and(eq(member.id, id), eq(member.organizationId, organizationId)));

export const updateOrganizationMember = async ({
  id,
  organizationId,
  data,
}: {
  id: string;
  organizationId: string;
  data: UpdateMemberPayload;
}) =>
  db
    .update(member)
    .set(data)
    .where(and(eq(member.id, id), eq(member.organizationId, organizationId)));
