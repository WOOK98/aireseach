import { eq } from "@workspace/db";
import { organization } from "@workspace/db/schema";
import { db } from "@workspace/db/server";

export const getOrganization = async ({ id }: { id: string }) =>
  db.query.organization.findFirst({
    where: eq(organization.id, id),
  });
