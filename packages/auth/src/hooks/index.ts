import { organization } from "./organization";
import { user, deleteUser } from "./user";

export const hooks = {
  organization,
  user,
  deleteUser,
} as const;
