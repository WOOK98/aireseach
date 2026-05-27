import { generateName } from "../../lib/utils";
import { DatabaseHooks } from "../types";

export const create = {
  before: async (user) => {
    const name = user.name?.trim() || generateName(user.email);

    return {
      data: {
        ...user,
        name,
      },
    };
  },
} satisfies NonNullable<DatabaseHooks["user"]>["create"];
