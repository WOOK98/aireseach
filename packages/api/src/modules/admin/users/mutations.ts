import { eq } from "@workspace/db";
import { account } from "@workspace/db/schema";
import { db } from "@workspace/db/server";

export const deleteAccount = async ({ id }: { id: string }) =>
  db.delete(account).where(eq(account.id, id));
