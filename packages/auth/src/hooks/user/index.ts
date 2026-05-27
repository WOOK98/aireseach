import { DatabaseHooks } from "../types";
import { create } from "./create";

export const user = {
  create,
} satisfies NonNullable<DatabaseHooks["user"]>;

export * from "./delete";
